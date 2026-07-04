// lib/store.js
// Thin wrapper around Vercel Blob that treats classroom/students.json as
// a single shared JSON "file". No database — just one JSON blob, read and
// rewritten with ETag-based optimistic concurrency so two students
// submitting at the same instant can't silently clobber each other.

const { get, put, BlobPreconditionFailedError } = require('@vercel/blob');

const PATHNAME = 'classroom/students.json';
const MAX_RETRIES = 6;

async function streamToText(stream) {
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks.map(c => Buffer.isBuffer(c) ? c : Buffer.from(c))).toString('utf-8');
}

// Reads the current students.json blob.
// Returns { data: {...}, etag: string|null }. If the blob doesn't exist
// yet (first run), returns an empty object and a null etag.
async function readAll() {
  try {
    const result = await get(PATHNAME, { access: 'private' });
    if (!result || result.statusCode !== 200 || !result.stream) {
      return { data: {}, etag: null };
    }
    const text = await streamToText(result.stream);
    let data = {};
    try { data = JSON.parse(text || '{}'); } catch (_) { data = {}; }
    const etag = (result.blob && result.blob.etag) || null;
    return { data, etag };
  } catch (err) {
    // Blob not found yet, or transient error — treat as empty store.
    return { data: {}, etag: null };
  }
}

// Overwrites students.json. Pass the etag you read it with; if someone
// else wrote in between, this throws BlobPreconditionFailedError so the
// caller can retry with fresh data instead of stomping on the other write.
async function writeAll(data, etag) {
  const body = JSON.stringify(data, null, 2);
  const opts = {
    access: 'private',
    allowOverwrite: true,
    addRandomSuffix: false,
    contentType: 'application/json',
  };
  if (etag) opts.ifMatch = etag;
  return put(PATHNAME, body, opts);
}

// Safely applies `mutate(data)` to the current store, retrying on write
// conflicts. `mutate` receives the parsed students object and should
// modify it in place (or return a new object).
async function mutate(mutateFn) {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const { data, etag } = await readAll();
    const result = mutateFn(data) || data;
    try {
      await writeAll(result, etag);
      return result;
    } catch (err) {
      if (err instanceof BlobPreconditionFailedError) {
        // Someone else wrote first — small backoff, then retry with fresh data.
        await new Promise(r => setTimeout(r, 60 + Math.random() * 120));
        continue;
      }
      throw err;
    }
  }
  throw new Error('Could not save after several attempts — please try again.');
}

module.exports = { readAll, writeAll, mutate, PATHNAME };
