# The Professional Development Project — Curriculum & Admin Guide

## Curriculum Overview (12 Weeks)
- Week 1: Orientation & goals — set SMART goals; intro to platform.
- Week 2: Resume foundations — baseline resume, measurable achievements.
- Week 3: Skills inventory — map skills to roles; fill gaps.
- Week 4: Portfolio setup — projects, case studies, artifacts.
- Week 5: Interview basics — STAR stories, mock questions.
- Week 6: Job search strategy — target roles, outreach plan.
- Week 7: Cover letters — writing targeted, outcome-focused letters.
- Week 8: Refine cover letters — iterate, personalize with metrics.
- Week 9: 30-60-90 plan — value plan for onboarding success.
- Week 10: Networking — refine plan via informational interviews.
- Week 11: Reflection artifact — video or 300-word essay.
- Week 12: Final portfolio — wrap, QA, submission.

Assignments are seeded weekly; each lesson has at least one assignment with a due date. Users can submit text or upload files.

## Technology Stack
- **Runtime**: Node.js v20.17.0
- **Framework**: Express.js with express-session for authentication
- **Database**: SQLite3 with express-session SQLiteStore
- **Security**: helmet (CSP configured), bcrypt v6.0.0 for password hashing
- **File Handling**: multer for multipart/form-data uploads
- **Environment**: Windows, configured via .env files

## Data Locations & Configuration
- **Database**: `backend/data/project.db` (SQLite)
  - Database module: `backend/data/db.js`
  - Schema: organizations, users, projects, lessons, assignments, submissions, user_visits
- **Uploads**: `backend/uploads/<userId>/<timestamp_filename>`
  - Publicly served from `/uploads/<userId>/<filename>`
- **Frontend**: `frontend/public/*` (static HTML/CSS/JS assets)
- **Server**: `backend/server.js` (main Express application)
- **Routes**: `backend/routes/api.js` (API endpoints)
- **Environment Config**: 
  - Root: `.env` with `DB_PATH=backend/data/project.db`
  - Backend: `backend/.env` with `DB_PATH=data/project.db`
  - Port: Defaults to 8080 (fallback from PORT=4000)
  - Session: Uses SESSION_SECRET from .env

## Server Setup
1. **Install Dependencies**: `npm install`
2. **Configure Environment**: Ensure .env files exist with correct DB_PATH
3. **Run Server**: `npm start` from project root
4. **Access Application**: http://localhost:8080 (or configured PORT)
**Default Admin**: username: `admin`. Set the password using the `SEED_ADMIN_PASSWORD` environment variable; do not commit plaintext secrets.

- Public Serving: Files are accessible at `/uploads/<userId>/<filename>`.
- Submissions Table: Tracks `assignment_id`, `user_id`, optional `content`, `file_path`, `submitted_at`, `feedback`, `grade`.
- Admin API:
  - `GET /api/submissions` — list all submissions with usernames and assignment titles.
  - `PUT /api/submissions/:id` — add `feedback` and `grade`.

## Admin — Timestamped Access (Visits Logging)
- Table: `user_visits` with `user_id`, `path`, `method`, `user_agent`, `ip`, `visited_at`.
- Insert: Middleware logs every request with session user when available.
- Endpoints:
  - `GET /api/analytics/visits?limit=100&offset=0` — raw logs.
  - `GET /api/analytics/visits/by-user` — aggregated totals, first/last visit.
- Usage Tips:
  - Filter by `path` in the client or via query params extension.
  - Correlate `visited_at` with submissions to analyze engagement.

## Admin Basics
- Create Users: `POST /api/users` (Admin only). Defaults to `Welcome123` if no password provided.
- Manage Lessons: `PUT /api/lessons/:week` (Admin) to update content.
- Assignments: `POST /api/assignments` (Admin) to add or adjust prompts/due dates.
- Seed Users: Run `node seed-user.js` to create default users (admin, alice, bob, charlie)
