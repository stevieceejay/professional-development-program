# Admin & User Guide

## Overview
- **Roles**: Users submit assignments; Admins manage content, review submissions, run analytics, and exports.
- **Structure**: Backend (`backend/` Express + SQLite), Frontend static pages (`frontend/public/`), Docs (`docs/`).
- **Technology Stack**:
  - Runtime: Node.js v20.17.0
  - Framework: Express.js with express-session
  - Database: SQLite3 with express-session SQLiteStore
  - Security: helmet (CSP configured), bcrypt v6.0.0
  - File Handling: multer for uploads
- **Key Paths**:
  - Backend server: `backend/server.js`
  - Routes: `backend/routes/api.js`
  - Database module: `backend/data/db.js`
  - Database file: `backend/data/project.db` (path via `DB_PATH`)
  - Public UI: `frontend/public/*.html`
  - Docs: `docs/` served by backend
  - Uploads: `backend/uploads/` (auto-created per-user subdirectories)

## Getting Started
- **Install**:
  - `npm install`
- **Environment Setup**:
  - Ensure `.env` file exists in project root
  - Key settings: `PORT=4000` (fallback to 8080), `SESSION_SECRET`, `DB_PATH=backend/data/project.db`
  - Backend `.env` should have `DB_PATH=data/project.db` (relative path)
- **Database Setup**:
  - Database initializes automatically on first run
  - Seed admin user: `node seed-user.js` (creates admin, alice, bob, charlie)
  - Default admin credentials: username=`admin`. Set password using `SEED_ADMIN_PASSWORD` environment variable; do not commit plaintext passwords.
- **Run**:
  - `npm start` (binds to `http://localhost:8080` or configured PORT)
  - Server automatically falls back to port 8080 if 4000 is in use
- **Dev**:
  - `npm run dev` (nodemon)
- **Health Check**:
  - `GET /api/health` → returns status and uptime
- **Smoke Tests**:
  - Quick: `npm run smoke -- --port=8080 --quick`
  - Auth: `npm run smoke -- --port=8080 --auth`

## Authentication
- **Signup**: `POST /api/signup` (auto-login + `connect.sid` cookie)
- **Signin**: `POST /api/signin` (returns session on success)
- **Session**: `GET /api/session` (returns current user or error)
- **Logout**: `POST /api/logout`
- **Notes**:
  - Cookie name: `connect.sid` (HttpOnly)
  - On Windows/PowerShell, prefer inline cookie in requests if env var issues occur.

## Lessons & Assignments
**Admin Navigation & Functions**
- **Admin Home (`admin.html`)**: Embedded guide and quick links.
- **Admin Dashboard (`admin-dashboard.html`)**:
  - View lessons overview and assignment counts.
  - Shortcuts to create/update lessons and create assignments.
- **Lessons Management**:
  - View lessons: `GET /api/lessons` (sorted by week/id).
  - View one: `GET /api/lessons/:id`.
  - Create lesson: `POST /api/lessons` with `{ title, week, overview }`.
  - Update lesson by week: `PUT /api/lessons/:week` with partial fields.
- **Assignments Management**:
  - List all: `GET /api/assignments`.
  - List by lesson: `GET /api/assignments/lesson/:lessonId`.
  - Create assignment: `POST /api/assignments` with `{ lesson_id, title, instructions }`.
  - Optional fields: `due_date`, `resources`.

## Submissions
- **Text Submission**: `POST /api/submissions` (requires session)
  - Body (modern): `{ assignment_id, content }`
  - Legacy-compatible: `{ lesson_id, content }` (system auto-resolves when possible)
- **File Upload**: `POST /api/submissions/upload` (multipart `file` + `assignment_id`) (requires session)
- **My Submissions**: `GET /api/submissions/me` (requires session)
- **Admin List**: `GET /api/submissions` (Admin)
- **Admin Feedback/Grade**: `PUT /api/submissions/:id` (Admin)
- **Delete**: `DELETE /api/submissions/:id` (Admin)

## Analytics & Exports
- **Visits (Admin)**:
  - List: `GET /api/analytics/visits?limit=&offset=&start=&end=&path=&user_id=`
  - Group by user: `GET /api/analytics/visits/by-user?start=&end=`
  - Delete: `DELETE /api/analytics/visits?start=&end=&user_id=`
- **Exports (Admin)**:
  - Submissions CSV: `GET /api/exports/submissions.csv` (filters available)
  - Visits CSV: `GET /api/exports/visits.csv` (filters available)
- **Share (Admin)**:
  - Email a submission: `POST /api/share/submission/:id/email` (SMTP config required)
  - PDF export: `GET /api/share/submission/:id/pdf`
  - DOC export: `GET /api/share/submission/:id/doc`
  - DOCX export: `GET /api/share/submission/:id/docx`

## Docs & Static Content
- **Public UI**: `frontend/public/index.html`, `dashboard.html`, `admin.html`
- **Uploads**: Served from `/uploads` (per-user directories)
- **Docs**: Served from `/docs`; add new guides under `docs/` (Markdown)

## Admin UI Flows
**Admin Operations Summary**
- **Create/Update Lessons**: Navigate to Admin Dashboard → Lessons. Use forms to add/edit. Changes reflect immediately for users.
- **Create Assignments**: Admin Dashboard → Assignments. Ensure each assignment links to a lesson.
- **Review Submissions**: Admin Dashboard → Submissions. Filter by user/date/assignment. Open detail, add feedback and grade.
- **Share Submissions**: From Admin page, choose a submission → Email/PDF/DOC/DOCX export.
- **Run Analytics**: Admin page → Exports & Docs section for visits CSV; analytics views for activity by user.
- **Bulk Delete Visits**: Use filters cautiously before deletion.

## Troubleshooting
- **Module Not Found Errors**:
  - If `Cannot find module '../data/db'` error occurs, ensure `backend/data/db.js` exists
  - Database module must be in `backend/data/` directory
- **Database Connection Issues**:
  - Check `DB_PATH` in .env files:
    - Root `.env`: `DB_PATH=backend/data/project.db`
    - Backend `.env`: `DB_PATH=data/project.db`
  - Ensure `backend/data/` directory exists
  - Database file path is relative to where Node process starts
- **Port Conflicts**:
  - If port 4000 is in use, server automatically falls back to port 8080
  - Update URLs and smoke test commands to use correct port
  - Check running processes: `Get-Process node` in PowerShell
- **Content Security Policy (CSP) Issues**:
  - Helmet CSP is configured to allow inline scripts: `'unsafe-inline'`
  - If frontend JavaScript doesn't execute, check browser console (F12) for CSP violations
  - Server uses custom helmet configuration in `backend/server.js`
- **Login Issues**:
  - Use the login form, not URL query parameters
  - Check browser console (F12) for JavaScript errors
  - Verify admin user exists: username=`admin`; password should be set via `SEED_ADMIN_PASSWORD`.
  - Session cookie name: `connect.sid` (HttpOnly)
- **Windows/PowerShell**:
  - If `Cookie` header is undefined, set `$env:COOKIE` or use inline cookie.
  - Avoid quoting issues: wrap cookie in single quotes.
  - Stop Node processes: `Get-Process node | Stop-Process -Force`
- **Connectivity**:
  - Bind address: server uses IPv4 (`0.0.0.0`) and port from `PORT` env or fallback `8080`.
  - Health endpoint: `/api/health` → must return 200.
  - Access URL: `http://localhost:8080` (or configured PORT)
- **Legacy DB Schema**:
  - Older DBs may lack `assignment_id`, `feedback`, `grade`; routes include fallbacks.
  - Lightweight migration runs at startup to add missing columns where possible.
  - If `lesson_id` is NOT NULL, submissions insert includes both `lesson_id` and `assignment_id`.
- **Uploads**:
  - Ensure `backend/uploads/` exists; per-user subdirectories are auto-created.
  - Files stored as: `backend/uploads/<userId>/<timestamp_filename>`
- **SMTP**:
  - Required env: `SMTP_HOST`, `SMTP_PORT`, `SMTP_FROM` (optional `SMTP_USER`, `SMTP_PASS`).

## Useful Commands
- **Start server**: `npm start` (from project root)
- **Dev mode**: `npm run dev`
-- **Create admin user**: `node seed-user.js` (requires `SEED_ADMIN_PASSWORD` or `SEED_DEFAULT_PASSWORD` to be set in environment)
- **Quick smoke**: `npm run smoke -- --port=8080 --quick`
- **Auth smoke**: `npm run smoke -- --port=8080 --auth`
- **Seed sample**: `npm run seed:sample` (uses `/api/assignments` first item)
- **Check running Node processes**: `Get-Process node` (PowerShell)
- **Stop Node processes**: `Get-Process node | Stop-Process -Force` (PowerShell)

## Security Notes
- **Sessions**: `express-session` with HttpOnly cookies; never expose raw cookie in front-end JS.
- **Validation**: Backend validates required fields; Admin-only endpoints enforce role checks.

## Environment Variables
- `PORT`: Server port (default 4000, fallback to 8080)
- `DB_PATH`: Path to SQLite DB file (relative to process start directory)
  - Root .env: `backend/data/project.db`
  - Backend .env: `data/project.db`
- `SESSION_SECRET`: Secret key for session encryption (required)
- `SMTP_*`: Email configuration (optional, see SMTP above)
  - `SMTP_HOST`: SMTP server hostname
  - `SMTP_PORT`: SMTP server port (typically 587)
  - `SMTP_USER`: SMTP authentication username
  - `SMTP_PASS`: SMTP authentication password
  - `SMTP_FROM`: From email address

## Support
- If issues persist, check server logs, confirm health endpoint, and run smoke tests. Share exact error messages to diagnose quickly.

---

## Curriculum Overview (Non-Coder Friendly)
- **Program Structure**: The curriculum is organized by weeks. Each week includes lessons with overviews, resources, and one or more assignments.
- **Typical Weekly Flow**:
  1. Read lesson overview and resources.
  2. Complete the assignment: submit text or upload a file.
  3. Receive feedback and an optional grade from an Admin.
- **Learner Pages**:
  - `index.html`: Welcome and entry point.
  - `login.html` / `signin.html`: Sign in securely to your account.
  - `signup.html`: Create an account (if enabled).
  - `dashboard.html`: View lessons, assignments, and your submissions.
- **Submitting Work**:
  - Go to `dashboard.html`, open your assignment, choose either text submission or file upload.
  - After submission, you can view it under “My Submissions”.
- **Feedback & Grades**:
  - Admins may add written feedback and a grade visible on your submission.

## Admin How-To (Step-by-Step)
- **Create a Lesson**:
  1. Open Admin Dashboard.
  2. Click “Add Lesson”.
  3. Fill in Title, Week number, and Overview; save.
- **Create an Assignment**:
  1. Go to Assignments in Admin Dashboard.
  2. Click “Add Assignment”.
  3. Select the related Lesson, set Title and Instructions; save.
- **Review a Submission**:
  1. Open Submissions list.
  2. Filter by user or assignment as needed.
  3. Click a submission → add Feedback and Grade → save.
- **Export Data**:
  1. On Admin page, set filters (date range, user, assignment).
  2. Click “Download Submissions CSV” or “Download Visits CSV”.
- **Share a Submission**:
  1. In Admin page → Share Submissions.
  2. Select recent submission or enter an ID.
  3. Choose Email, PDF, or DOC/DOCX.

## Glossary (Plain Language)
- **Lesson**: A teaching unit with content and resources.
- **Assignment**: A task to complete for a lesson.
- **Submission**: Your completed work for an assignment.
- **Feedback**: Comments from Admins on your submission.
- **Grade**: Optional numeric/letter score given by Admins.
- **Visits**: Logged page views to understand usage.

## Accessibility & Tips
- Use clear titles and overviews to guide learners.
- Keep assignments concise with concrete instructions.
- Prefer PDF/DOC exports when sharing externally.
- When in doubt, check the Admin Guide page (`admin.html`) embedded in the app.
