# Ethical Hacking Quiz — Classroom Edition

Your original single-file quiz, extended with a classroom tracking system for
~19 students, deployed on Vercel. No database — just one JSON "file"
(`classroom/students.json`) stored in **Vercel Blob**, read and written
through two tiny serverless functions.

## Why Blob instead of a literal `students.json` on disk

On Vercel, serverless functions don't have a persistent local filesystem —
anything written to disk disappears after the request ends, and isn't
shared between the different servers handling your 19 students' requests.
Vercel Blob is the closest thing to "just a JSON file" that actually
persists and is shared across everyone hitting your deployed link. You still
only ever think about it as one JSON object; the blob SDK just reads/writes it.

## What's in this project

```
index.html          → the quiz itself (your original, extended)
api/students.js     → GET: list all students · POST: a student's browser
                       reports its progress (auto-called, debounced)
api/admin.js         → password-checked actions: reset one / reset all / delete
lib/store.js         → reads & writes the shared students.json blob safely
lib/mergeStudent.js  → turns a progress snapshot into a classroom record
package.json         → declares the @vercel/blob dependency
```

## Deploy steps

1. **Push this folder to a GitHub repo** (or drag-and-drop deploy via the
   Vercel dashboard / `vercel` CLI — either works).
2. **Import the repo into Vercel** as a new project. No framework preset
   needed — Vercel auto-detects the `api/` folder as serverless functions
   and serves `index.html` as-is.
3. **Add a Blob store**: in your Vercel project → **Storage** tab → **Create
   Database** → **Blob** → connect it to this project. Vercel automatically
   adds a `BLOB_READ_WRITE_TOKEN` environment variable for you — you don't
   need to touch it.
4. **Set the admin password** (optional but recommended): in **Settings →
   Environment Variables**, add `ADMIN_PASSWORD` with whatever password you
   want. If you skip this, it defaults to `admin123` — change it before
   sharing the link with your class.
5. **Deploy.** Share the resulting `https://your-project.vercel.app` link
   with your 19 classmates.

## How it behaves

- First visit → name popup → saved locally, never asked again on that device.
  "Change Name" button in the footer lets them switch.
- Every time `saveProgress()` runs inside the quiz (finishing a unit,
  earning XP, etc.), the classroom module debounces for ~700ms then POSTs
  the student's current cumulative progress to `/api/students`. Numeric
  fields (score, XP, streak, attempts) only ever move **up** — a cleared
  browser or a fresh device can't erase someone's best result.
- **Ctrl+Shift+A**, or the 🔐 admin button in the footer, opens the admin
  password prompt. The password is checked against `/api/admin` server-side
  (not just compared in the browser), then the dashboard opens: Overview,
  Students (search/sort/status, click a row for a detail side panel),
  Leaderboard (5 categories, top 10), Analytics (4 live charts), and Export
  (JSON / CSV / Excel, plus a "reset everyone" danger button).

## Known limitations (by design, for simplicity)

- **Not encrypted, not enterprise auth.** The admin password is one shared
  constant, exactly as you asked for. Fine for a classroom, not for anything
  sensitive.
- **Race conditions:** if two students finish a quiz in the exact same
  second, the write includes a retry-with-fresh-data loop (using Blob's
  ETag support), so it's very unlikely — but not impossible — for one write
  to be briefly delayed. For 19 students this risk is negligible.
- **Local dev:** running `vercel dev` locally works once you `vercel link`
  the project and `vercel env pull` so the Blob token is available locally.
  Without a linked Blob store, the app still runs but progress won't sync
  (it fails silently and the quiz keeps working offline).
