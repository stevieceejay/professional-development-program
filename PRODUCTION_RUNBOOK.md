# Production Runbook

Operational run sequence for deploying the ARG Professional Development Platform safely.

## 1) Pre-Deploy Gate (must pass)

From repo root:

```bash
npm run preflight:prod
npm run smoke:auth
npm run risk:audit:prod
```

- `preflight:prod` and `smoke:auth` must pass.
- `risk:audit:prod` may fail only if RR-001/RR-002 acceptance is active and unexpired.

## 2) Prepare Production Environment

On production host (Linux):

```bash
cd /home/argapp/arg-professional-development
cp env.production.example .env
```

Set real values in `.env`:

```env
NODE_ENV=production
PORT=5000
SESSION_SECRET=<64+ char random value>
DB_PATH=/home/argapp/arg-professional-development/backend/data/project.db
HUGGINGFACE_API_KEY=<optional>
SMTP_HOST=<optional but complete if used>
SMTP_PORT=587
SMTP_USER=<...>
SMTP_PASS=<...>
SMTP_FROM=<...>
```

Secure env file:

```bash
chmod 600 .env
```

Generate secret if needed:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 3) Deploy (standard)

```bash
cd /home/argapp/arg-professional-development
git fetch --all
git checkout main
git pull origin main
npm ci
npm run build
```

Start/restart app (PM2 recommended):

```bash
pm2 start backend/server.js --name arg-prof-dev || pm2 restart arg-prof-dev
pm2 save
```

## 4) Post-Deploy Verification

```bash
curl -i http://127.0.0.1:5000/api/health
curl -I http://127.0.0.1:5000/uploads/videos/week1.mp4
```

Then from repo root (or CI runner):

```bash
npm run smoke -- --quick
```

Manual checks:
- Sign in as admin and non-admin.
- Confirm admin-only routes deny non-admin users.
- Confirm lesson week 1 video playback works.

## 5) Security Confirmation

- Verify cookies over HTTPS: `Secure`, `HttpOnly`, `SameSite=Strict`.
- Verify HSTS and no-sniff headers are present.
- Confirm current risk acceptance dates are valid (RR-001/RR-002).

## 6) Rollback Procedure

If deploy fails:

```bash
cd /home/argapp/arg-professional-development
git log --oneline -n 5
git reset --hard <previous-good-commit>
npm ci
npm run build
pm2 restart arg-prof-dev
curl -i http://127.0.0.1:5000/api/health
```

If DB corruption suspected, restore latest verified backup before restart.

## 7) Release Sign-off

Record in `PRODUCTION_CHECKLIST.md` execution log:
- date/time
- deployed commit hash
- smoke/audit outcomes
- approver
- rollback status (not needed / executed)
