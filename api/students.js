// api/students.js
// GET  -> { students: { [name]: record } }  (used by the Admin Panel)
// POST -> body: { name, xp, rankName, unitsInfo, progress } upserts one
//         student's record, keeping best-ever values. Called automatically
//         by every student's browser whenever their local progress changes.

const { mutate, readAll } = require('../lib/store');
const { mergeStudent } = require('../lib/mergeStudent');

function readJsonBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch (_) { return {}; }
  }
  return {};
}

module.exports = async (req, res) => {
  try {
    if (req.method === 'GET') {
      const { data } = await readAll();
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json({ students: data });
    }

    if (req.method === 'POST') {
      const body = readJsonBody(req);
      const name = (body.name || '').toString().trim();
      if (!name || name.length < 2) {
        return res.status(400).json({ error: 'A valid student name is required.' });
      }
      if (name.length > 50) {
        return res.status(400).json({ error: 'Name too long.' });
      }

      const updated = await mutate((data) => {
        const existing = data[name] || null;
        data[name] = mergeStudent(existing, body);
        return data;
      });

      return res.status(200).json({ ok: true, student: updated[name] });
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('api/students error', err);
    return res.status(500).json({ error: 'Server error, please try again.' });
  }
};
