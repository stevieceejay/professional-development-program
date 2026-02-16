# The Professional Development Project

A Node.js/Express + SQLite web app providing lessons, assignments, submissions, and administration tools for professional development.

---

## Compression & Optimization for Grade-Level Production

This project is optimized for **fast loading and compatibility across all devices**, including older computers and mobile devices, to meet grade-level production standards.

### Backend Compression

- **HTTP Compression:**  
  The backend uses the [`compression`](https://www.npmjs.com/package/compression) middleware for Express, which automatically compresses all HTTP responses using gzip or Brotli.  
  This reduces the amount of data sent over the network, improving load times for all users.

### Frontend Asset Minification

- **JavaScript Minification:**  
  All JavaScript files are minified using [`terser`](https://www.npmjs.com/package/terser) to remove whitespace, comments, and shorten variable names, resulting in smaller file sizes.

- **CSS Minification:**  
  CSS files are minified using [`csso-cli`](https://www.npmjs.com/package/csso-cli) or [`clean-css-cli`](https://www.npmjs.com/package/clean-css-cli) for maximum compatibility and efficiency.

- **HTML Minification:**  
  HTML files can be minified using [`html-minifier-terser`](https://www.npmjs.com/package/html-minifier-terser) to further reduce file size.

- **How to Minify Assets:**  
  Example commands (run in your project root):
  ```sh
  # Minify JavaScript
  npx terser frontend/public/scripts.js -o frontend/public/scripts.min.js -c -m

  # Minify CSS (using csso-cli)
  npx csso frontend/public/style.css --output frontend/public/style.min.css

  # Or, using clean-css-cli
  npx cleancss -o frontend/public/style.min.css frontend/public/style.css

  # Minify HTML (optional)
  npx html-minifier-terser --collapse-whitespace --remove-comments --minify-css true --minify-js true -o frontend/public/index.min.html frontend/public/index.html
  ```

- **HTML References:**  
  All HTML files are updated to reference the minified `.min.js` and `.min.css` files for best performance.

### Static File Serving

- All static assets (HTML, CSS, JS, images) are served efficiently using Express’s static middleware.
- The backend is configured to serve minified files by default.

### Session Storage

- Sessions are stored using [`connect-sqlite3`](https://www.npmjs.com/package/connect-sqlite3) for reliability and scalability.

### Rate Limiting

- Sensitive endpoints (sign-in, uploads) are protected with [`express-rate-limit`](https://www.npmjs.com/package/express-rate-limit) to prevent abuse and ensure fair access for all users.

### Device Compatibility

- All optimizations are designed to work on a wide range of devices, including:
  - Older Windows/Mac computers
  - Chromebooks
  - Tablets and smartphones
- No modern browser features are required for basic functionality.

---

## Features
- Lessons: 12-week grid, video support, assignment prompts
- Submissions: Text and file uploads, user dashboard views
- Admin: Manage users, lessons, and assignments
- Docs: Admin and user guides served from `/docs`
- Search: Global overlay (Ctrl/Cmd+K) powered by a unified term index

## Tech Stack
- Backend: Node.js, Express, SQLite, `express-session`, `multer`, `bcrypt`, `dotenv`
- Frontend: Static HTML/CSS/JS in `frontend/public`
- Tooling: VS Code launch configs, Windows-friendly PowerShell commands

## Getting Started
```powershell
# From the project root
$env:PORT=4001; node server.js
# Visit http://localhost:4001
```

## Development
- Frontend: Edit files under `frontend/public/`
- Backend: Routes in `backend/routes/`, server in `backend/server.js`
- Docs: Markdown under `docs/` (served statically and via backend)

## Licensing
This project is licensed under the MIT License (see `LICENSE`).

Commercial licensing is available using the EULA template in `docs/EULA.md`.
We can adapt terms for seats, support SLAs, and pricing.

## Status Checks (Windows PowerShell)
```powershell
Invoke-WebRequest http://localhost:4001/ -UseBasicParsing | Select-Object -ExpandProperty StatusCode
Invoke-WebRequest http://localhost:4001/scripts.js -UseBasicParsing | Select-Object -ExpandProperty StatusCode
Invoke-WebRequest http://localhost:4001/api/health -UseBasicParsing | Select-Object -ExpandProperty StatusCode
```

## Notes
- If port 4001 is busy, the server auto-increments to the next available port.
- Search bars have been removed from pages; use the overlay (`Ctrl/Cmd+K`).

**Admin Guide**

Quick Links:
- Program Overview: `docs/program_overview.md`
- Curriculum & Admin Guide: `docs/curriculum_admin_guide.md`
- Privacy Policy: `docs/privacy_policy.md`
- Terms of Service: `docs/terms_of_service.md`
- Env Example: `env.example`

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
  ```powershell
  $env:SESSION_SECRET="change-me-please"
  npm start
  ```

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
  $body = '{"username":"testuser","email":"test@example.test","password":"Secret123!","confirmPassword":"Secret123!"}'
  Invoke-RestMethod -Method Post -Uri http://localhost:4000/api/signup -ContentType 'application/json' -Body $body
  ```

- Or a Node one-liner (works without curl):
  ```powershell
  node -e "const http=require('http');const d=JSON.stringify({username:'testuser',email:'t@example.test',password:'Secret123!',confirmPassword:'Secret123!'});const req=http.request({host:'localhost',port:4000,path:'/api/signup',method:'POST',headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(d)}},res=>{res.setEncoding('utf8');let b='';res.on('data',c=>b+=c);res.on('end',()=>console.log('RESPONSE',b))});req.write(d);req.end();"

  ---
  Guidance: test emails and repo privacy
  ------------------------------------
  - Use the reserved domain `example.test` for seeded and test user emails to avoid accidentally contacting real addresses.
  - Keep this repository private while in active development. Do not commit real secrets into `.env` — use `.env.example` as a template and add `.env` to `.gitignore`.
  - Consider adding a secrets-scan step in CI (git-secrets, truffleHog) to prevent accidental leaks before pushing branches or opening PRs.

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

---

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

---

**This project is production-ready for grade-level use, with:**
- Minified and compressed assets
- Efficient backend compression
- Device-agnostic compatibility
- Secure and scalable session and rate limiting

---

## Copyright & License

**Professional Development Project platform**  
Copyright © 2026 Stephen. All Rights Reserved.

This software and all educational content are proprietary and confidential. See [LICENSE](LICENSE) and [COPYRIGHT.txt](COPYRIGHT.txt) for complete terms.

*For any questions or further optimization needs, please contact the project maintainer.*