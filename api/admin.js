// api/admin.js
// Password-gated admin actions. The password itself can stay a simple
// constant (set it via the ADMIN_PASSWORD env var in Vercel, or it falls
// back to the default below) — the point of checking it server-side is
// just so a stray API call can't wipe the class's data without it.

const { mutate } = require('../lib/store');
const { freshStudent } = require('../lib/mergeStudent');

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

function readJsonBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch (_) { return {}; }
  }
  return {};
}

module.exports = async (req, res) => {
  try {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const body = readJsonBody(req);
    const { password, action, name } = body;

    if (password !== ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'Invalid admin password.' });
    }

    if (action === 'verify') {
      return res.status(200).json({ ok: true });
    }

    if (action === 'delete') {
      if (!name) return res.status(400).json({ error: 'name required' });
      const updated = await mutate((data) => { delete data[name]; return data; });
      return res.status(200).json({ ok: true, students: updated });
    }

    if (action === 'reset') {
      if (!name) return res.status(400).json({ error: 'name required' });
      const updated = await mutate((data) => {
        if (data[name]) data[name] = freshStudent(name);
        return data;
      });
      return res.status(200).json({ ok: true, students: updated });
    }

    if (action === 'resetAll') {
      const updated = await mutate((data) => {
        Object.keys(data).forEach(n => { data[n] = freshStudent(n); });
        return data;
      });
      return res.status(200).json({ ok: true, students: updated });
    }

    return res.status(400).json({ error: 'Unknown action' });
  } catch (err) {
    console.error('api/admin error', err);
    return res.status(500).json({ error: 'Server error, please try again.' });
  }
};
