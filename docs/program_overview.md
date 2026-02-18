# The Professional Development Project — Program Overview (Users, Admins, Nonprofits)

## For Users
- Sign Up / Sign In: Create an account and sign in to enable submissions.
- Lessons: Open `lessons.html` (or `index.html`) to view weekly videos and prompts.
- Assignments: Each week has at least one assignment; submit via text or file.
- Submissions: See your history and uploaded files under `dashboard.html` (My Submissions).
- Support: Use the week selector to focus on a specific week; the page shows due dates and late indicators when enabled.

## For Admins
- Access: Admin-only endpoints secured by session role (`Admin`).
- Manage Users: `GET/POST/PUT/DELETE /api/users` to list, create, and update users.
- Lessons: Update weekly lesson content via `PUT /api/lessons/:week` (title, description, video). Create new lessons with `POST /api/lessons`.
- Assignments: Create/update prompts and due dates via `POST /api/assignments`.
- Submissions:
  - `GET /api/submissions` to review all submissions (with usernames and assignment titles).
  - `PUT /api/submissions/:id` to add feedback or grade.
- Analytics:
  - `GET /api/analytics/visits` to view raw visit logs.
  - `GET /api/analytics/visits/by-user` to view aggregated visit counts and first/last visit.

## For Nonprofit Organizations
- Purpose: Provide a structured 12-week curriculum emphasizing employability, portfolio-building, and job readiness.
- Participation Tracking: Engagement is measured via submissions and visit logs (sessions, page/API interactions).
- Data Export: SQLite DB (`backend/data/project.db`) can be exported or queried for reporting.
- Privacy & Security: Session-based auth, hashed passwords (bcrypt). Consider updating secrets for production and adding HTTPS.
- Deployment: Serve the Express app; static assets in `frontend/public`. Configure `PORT` and environment vars as needed.

## How It Works (End-to-End)
1. Backend (Express + SQLite): Provides auth, lessons/assignments CRUD, submissions, file uploads, and analytics logging.
2. Frontend (HTML/CSS/JS): Renders weekly grid, submission boxes, dashboard with My Submissions.
3. File Uploads: Stored under `/backend/uploads/<userId>/...` and accessible via `/uploads/...`.
4. Sessions: `express-session` maintains user state for protected routes.
5. Port Fallback: Server starts on `4000`, falls back upward if needed; smoke tests detect the active port.

## Quick Start
- Install deps: `npm install`
- Seed data (already provided): lessons and assignments are included.
- Start server: `npm start`
- Basic checks: `npm run smoke` (or `npm test` quick)
- Explore:
  - `http://localhost:4000/lessons.html`
  - `http://localhost:4000/login.html`
  - `http://localhost:4000/dashboard.html`

## Extending
- Add new lessons or assignments via admin endpoints.
- Customize styles in `frontend/public/style.css`.
- Enhance analytics (filters by path/method/date range) by extending `/api/analytics/*` endpoints.
