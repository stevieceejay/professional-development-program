# Copilot Instructions: ARG Professional Development Platform

## Project Overview
Node.js/Express web platform for 12-week professional development courses with video lessons, assignment submissions, AI tutoring, and multi-tenant organization support. Built for **Windows development** with PowerShell tooling and optimized for grade-level production (minification, compression, mobile-friendly).

## Architecture

### Core Stack
- **Backend**: Node.js + Express + SQLite ([backend/server.js](../backend/server.js), [backend/routes/api.js](../backend/routes/api.js))
- **Frontend**: Static HTML/CSS/JS served from `frontend/public/` (no framework - vanilla JS)
- **Database**: SQLite with shared connection singleton ([backend/data/db.js](../backend/data/db.js))
- **Session**: `express-session` with `connect-sqlite3` store (server.js)
- **Security**: Helmet CSP, rate limiting, input sanitization ([backend/middleware/security.js](../backend/middleware/security.js))

### Multi-Tenant Design
- All data tables include `org_id` foreign key to `organizations` table
- Default "Global" org (slug: `global`, id: 1) for single-tenant use
- Organization access via **signed HMAC tokens** in URLs (`signToken/verifyToken` in api.js)
- See [MULTI_TENANT_GUIDE.md](../MULTI_TENANT_GUIDE.md) for sharable link patterns

### Key Services
- **AI Tutor** ([backend/services/ai-helper.js](../backend/services/ai-helper.js)): Hugging Face Inference API (Mistral-7B-Instruct) with rate limiting (10 questions/hour per user stored in `ai_usage` table)
- **Video Upload** ([backend/middleware/videoUpload.js](../backend/middleware/videoUpload.js)): Multer with 500MB limit, organized by user ID in `backend/uploads/`
- **Email** (api.js): Nodemailer for password reset via SMTP (configured in [backend/config.js](../backend/config.js))

## Development Workflows

### Starting the Server (Windows PowerShell)
```powershell
# From project root
cd backend
npm start  # Uses PORT from .env or defaults to 5000
```
- Server logs via Pino ([backend/logger.js](../backend/logger.js))
- Visit `http://localhost:5000` (or PORT specified in `.env`)

### Testing
```powershell
# Quick smoke test (lessons + assignments only)
npm run smoke -- --quick

# Full smoke test with auth flows
npm run smoke:auth

# PowerShell smoke test
.\smoke.ps1 -BaseUrl "http://localhost:5000"
```
- Tests probe `/api/health`, lesson/assignment CRUD, session cookies
- See [backend/tools/smoke.js](../backend/tools/smoke.js) for Node.js harness (uses `http.request` for Windows compatibility)

### Database Operations
- **Schema**: Tables auto-created on startup via [backend/data/db.js](../backend/data/db.js) serialization
- **Seeding**: Python scripts (`backend/populate_all_12_weeks.py`, `backend/create_week1_complete.py`) or `npm run seed:sample`
- **Inspection**: `check_*.py` scripts in root (e.g., `check_users.py`, `check_schema.py`)

### Build & Optimization
```powershell
npm run build  # Minifies JS/CSS and generates Brotli .br files
npm run build:js   # Terser for scripts.js → scripts.min.js
npm run build:css  # CleanCSS for style.css → style.min.css
npm run build:br   # Brotli compression at quality 11
```
- Frontend HTML references `.min.js` and `.min.css` files for production
- Backend uses `compression` middleware for gzip/Brotli responses

## Code Conventions

### Backend Patterns
1. **Database Access**: Always use the singleton `db` from `backend/data/db.js`
2. **Session Auth**: Check `req.session.user` for authentication; use `requireAuth` and `requireAdmin` middleware
3. **Input Sanitization**: Always call `sanitizeInput()` on user-provided strings before DB queries
4. **Org Isolation**: Filter queries by `org_id` from `req.session.org.id` or default to `1` (Global org)
5. **Error Handling**: Return JSON with `{ status: 'error', message: '...' }` format; log errors via `logger`

### Frontend Patterns
1. **API Calls**: Use [frontend/public/js/api.js](../frontend/public/js/api.js) for shared fetch wrappers (`fetchLessons()`, `submitAssignment()`)
2. **DOM Rendering**: Vanilla JS with template literals (see [lessons.html](../frontend/public/lessons.html) `displayLessons()`)
3. **Toast Notifications**: Call `showToast(message, 'success'|'error')` from [scripts.js](../frontend/public/scripts.js)
4. **No Build Step**: All frontend code runs directly in browser (ES5+ for compatibility)

### Security Practices
- **CSP**: Helmet configured with `unsafe-inline` for scripts/styles (server.js line 60-85)
- **Rate Limits**: 5 req/min for `/api/auth/signin`, 3 req/min for uploads
- **Password Validation**: 8+ chars with uppercase, lowercase, number, special char ([middleware/security.js](../backend/middleware/security.js))
- **File Uploads**: Whitelist extensions in `videoUpload.js` (mp4, pdf, docx, etc.)

## Common Tasks

### Adding a New API Endpoint
1. Add route in [backend/routes/api.js](../backend/routes/api.js)
2. Use `requireAuth` or `requireAdmin` middleware if needed
3. Filter by `org_id` from session if multi-tenant
4. Return consistent JSON format: `{ status: 'success'|'error', data?: any, message?: string }`

### Creating Database Migrations
1. Add `.sql` file to `backend/data/migrations/`
2. Run manually: `sqlite3 backend/data/project.db < backend/data/migrations/yourfile.sql`
3. Update [backend/data/db.js](../backend/data/db.js) schema creation if modifying core tables

### Deploying (Production)
- See [DEPLOYMENT.md](../DEPLOYMENT.md) for full guide (Nginx reverse proxy, PM2, SSL)
- Required env vars: `SESSION_SECRET`, `HUGGINGFACE_API_KEY` (optional), `SMTP_*` (for email)
- Use [backend/config.js](../backend/config.js) `requireEnv()` pattern for strict validation

## File Organization
- `backend/server.js` - Express app entry point
- `backend/routes/api.js` - All REST endpoints (1000+ lines - main business logic)
- `backend/data/db.js` - SQLite connection and schema
- `backend/services/ai-helper.js` - AI tutoring service
- `frontend/public/*.html` - Static pages (no templating)
- `frontend/public/js/api.js` - Shared API client functions
- `docs/` - Admin guides, EULA, privacy policy (served as static files)

## Dependencies & Tools
- **bcrypt**: Password hashing (always use `bcrypt.hash()` with 10 rounds)
- **multer**: File upload handling
- **marked**: Markdown to HTML conversion for docs
- **Pino**: Structured logging (JSON output)
- **Terser/CleanCSS**: Asset minification
- **Python 3.x**: Database seeding scripts (not required for runtime)

## Known Quirks
- PowerShell is primary CLI (all scripts use `.ps1` or `npm run` for Windows compatibility)
- Database path resolved via `process.env.DB_PATH || path.join(__dirname, 'data', 'project.db')`
- AI rate limiting stored in DB, not memory (survives server restart)
- Video URLs stored as relative paths `/uploads/videos/filename.mp4` (no external CDN)
- Frontend uses inline `<script>` tags in HTML files (no module bundler)

## Copyright & Licensing
All files include copyright header: `Copyright © 2026 Stephen. All Rights Reserved.`
Licensed under MIT (see [LICENSE](../LICENSE)); commercial EULA template in [docs/EULA.md](../docs/EULA.md)
