**Admin Guide**

This document is a short operational guide for administrators who need to update, test, compare, or migrate the site and its data. Keep a database backup before running destructive operations.

**Project Overview**
- **Backend**: `backend/` — Node + Express server. Key files:
  - `backend/server.js` — starts the server and serves `frontend/public`.
  - `backend/routes/api.js` — API routes (login, signup, projects, users, admin endpoints).
  - `backend/data/db.js` — SQLite connection and schema creation.
  - `backend/data/migrate_users_table.js` — safe migration script (recreates `users` table with `email UNIQUE` and `created_at`).
  - `backend/data/cleanup_duplicates.js` — preview/apply duplicate username cleanup (uses `cleanup_actions.json`).

- **Frontend**: `frontend/public/` — static site (HTML/CSS/JS).
  - `frontend/public/index.html`, `signin.html`, `signup.html`, `dashboard.html`, `admin.html` — pages.
  - `frontend/public/style.css` — main stylesheet.
  - `frontend/public/scripts.js` — shared client-side logic.

**Basic local run**
- Start server (PowerShell):
  `node backend/server.js`

- If port 4000 is in use, stop node processes (PowerShell):
  `Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force`

**Database: backup & inspection**
- Make a backup before changes (PowerShell):
  `Copy-Item .\backend\data\project.db .\backend\data\project.db.bak -Force`

- Inspect `users` schema (if you have sqlite3 installed):
  `sqlite3 .\backend\data\project.db "PRAGMA table_info(users);"`

- Show table CREATE SQL:
  `sqlite3 .\backend\data\project.db "SELECT sql FROM sqlite_master WHERE type='table' AND name='users';"`

**Safe migration (users table)**
- A safe migration script exists at `backend/data/migrate_users_table.js`. It will:
  1. Create a timestamped DB backup.
  2. Abort if duplicate `email` or duplicate `username` values are detected.
  3. Recreate `users` as `users_new`, copy rows (sanitizing `role`), then rename.

- Run migration (it will back up automatically):
  `node backend/data/migrate_users_table.js`

**Cleaning duplicates (manual workflow)**
- A helper preview/apply script is at `backend/data/cleanup_duplicates.js`.
  - First run (no args) prints duplicates and writes a sample `cleanup_actions.json`.
  - Edit `backend/data/cleanup_actions.json` to list actions (merge/delete/rename).
  - Preview SQL produced at `backend/data/cleanup_preview.sql`.
  - Apply changes:
    `node backend/data/cleanup_duplicates.js --apply`

- Example action objects for `cleanup_actions.json`:
  - Merge: `{ "op": "merge", "source": 4, "target": 2 }` (copies non-empty fields from `source` to `target`, then deletes `source`).
  - Delete: `{ "op": "delete", "id": 4 }`.
  - Rename: `{ "op": "rename", "id": 10, "username": "admin_1" }`.

**Testing the signup API**
- Use PowerShell `Invoke-RestMethod` (example):
  ```powershell
  $body = '{"username":"testuser","email":"test@example.com","password":"Secret123!","confirmPassword":"Secret123!"}'
  Invoke-RestMethod -Method Post -Uri http://localhost:4000/api/signup -ContentType 'application/json' -Body $body
  ```

- Or a Node one-liner (works without curl):
  ```powershell
  node -e "const http=require('http');const d=JSON.stringify({username:'testuser',email:'t@example.com',password:'Secret123!',confirmPassword:'Secret123!'});const req=http.request({host:'localhost',port:4000,path:'/api/signup',method:'POST',headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(d)}},res=>{res.setEncoding('utf8');let b='';res.on('data',c=>b+=c);res.on('end',()=>console.log('RESPONSE',b))});req.write(d);req.end();"
  ```

**How to update/compare files**
- Standard git workflow applies. From project root:
  - `git status`
  - `git diff` (compare working tree to HEAD)
  - `git add <file>` and `git commit -m "msg"`

- To compare specific files:
  - `git diff -- frontend/public/style.css` or use a GUI diff tool.

**Common troubleshooting**
- Error `EADDRINUSE`: port 4000 already in use. Stop node or choose a different port.
- Error `Unexpected token '<'` when parsing JSON: server returned HTML (stack trace or redirect). Check server logs and the API error handler in `backend/server.js`.
- Error `SQLITE_ERROR: no such column: ...`: run the `PRAGMA table_info(users)` query and/or run the migration script after resolving duplicates.

**Notes & best practices**
- Always back up `backend/data/project.db` before migrations or deletes.
- Use `cleanup_duplicates.js` to preview SQL and only apply after review.
- Keep `frontend/public/style.css` and the login/signup pages in sync when changing form fields.

If you want, I can add a short HTML view that serves this README inside the admin page (`admin.html`) for quick access. Reply `add admin view` and I'll scaffold it.
# Human–AI Professional Development Program

A 12-week, rolling-enrollment curriculum that blends digital literacy, professional development, AI prompt fluency, and a spiritual philosophy of business. Includes an MVP front-end demo (Login → Dashboard → Admin) to visualize nonprofit integration and proof of service.

## 🌟 Philosophy
> Business is spiritual — when your spirit is right, so is your business.  
> Every job or school endeavor is a spiritual connection between entities.

Work is a mutual exchange of growth: the individual gains skills and purpose; the organization advances its mission. This program teaches learners to honor those connections through professionalism, reflection, and adaptive tools.

## 📚 Curriculum Overview (12 Weeks, Rolling Enrollment)
1. Professional Mindset & Spiritual Connection  
2. Digital Education I — Gmail & Drive  
3. Digital Education II — Docs, Sheets, Slides  
4. Digital Education III — Notion, Zoom, Slack  
5. Resume Fundamentals  
6. Resume Refinement  
7. Cover Letter Fundamentals  
8. Cover Letter Refinement  
9. Job Search Strategy (90-day plan)  
10. Networking & Communication Skills  
11. Video Reflection Assignment  
12. Final Portfolio & Completion

Each module produces a concrete deliverable logged in the dashboard for nonprofit proof of service. Learners can opt in anytime and progress at their own pace, with one weekly Zoom session for community and accountability.

## 🤖 AI Prompt Literacy
Learners practice prompting to:
- Compare personality types and teamwork dynamics.
- Refine resumes and cover letters with targeted feedback.
- Generate job search plans and outreach scripts.
- Journal reflections and integrate feedback constructively.

See `ai-prompts.md` for the learner guide.

## 🚀 Demo MVP (Frontend)
- `frontend/login.html` — Sign-in page (demo redirect).
- `frontend/dashboard.html` — 12 modules with upload buttons and weekly Zoom section.
- `frontend/admin.html` — Table view of learner progress and artifacts (demo only).

These pages are static for demonstration and accessibility. Backend integration (role-based routing, uploads, storage) plugs in later.

## 🔧 Tech Stack (Current Training)
- Frontend: HTML, CSS, JavaScript (React planned)
- Backend (demo): Flask (Python) placeholder; Node.js compatible
- Database: SQL fundamentals
- Collaboration: GitHub, Notion, Zoom, Slack

## 🔗 Alignment with PTK
Designed to integrate with PTK’s stack and standards (.NET/ADO + SQL, React, secure HTML, Axios APIs, CI/CD to Azure, HIPAA awareness). The program remains under my control, accessible to organizations via secure links and role-based access.

## 📌 Getting Started (Demo)
1. Open `frontend/login.html` in a browser.
2. Sign in (demo) → redirects to `dashboard.html`.
3. Click “Admin view (demo)” to see artifacts and proof of service.
4. Review `curriculum-outline.md` and `ai-prompts.md` for program details.

## 🗺️ Roadmap
- Connect uploads and authentication to backend
- Enable role-based routing and encrypted storage
- Add React components and Axios APIs
- Generate completion reports for nonprofits