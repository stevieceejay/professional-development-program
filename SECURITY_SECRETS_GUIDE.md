# Security & Secrets Management Guide

**Date**: February 2026  
**Status**: Production-Ready Steps  
**Scope**: Securing environment variables, API keys, and sensitive credentials

---

## Why Secret Scanning Failed

The GitHub Actions **gitleaks** workflow detected committed secrets in `.env`:
- `SESSION_SECRET` (cryptographic session key)
- `HUGGINGFACE_API_KEY=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` (active API token)
- `SMTP_PASS` (email credential)

**Root Cause**: `.env` was committed to git history, exposing plaintext credentials to anyone with repository access.

---

## 🚨 Immediate Actions (If Secrets Were Exposed)

1. **Revoke the Hugging Face API Key immediately**
   - Go to: https://huggingface.co/settings/tokens
   - Delete or revoke the token: `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`
   - Generate a new token and update GitHub Actions secret

2. **Regenerate SESSION_SECRET**
   - This invalidates all existing sessions (force users to re-login)
   - Generate a new cryptographically secure string:
     ```powershell
     # Windows PowerShell
     $bytes = [byte[]]::new(32)
     [System.Security.Cryptography.RNGCryptoServiceProvider]::new().GetBytes($bytes)
     [BitConverter]::ToString($bytes).Replace('-','').ToLower()
     ```
   - Update GitHub Actions secret `SESSION_SECRET`

3. **Rotate SMTP credentials**
   - Change the SMTP password in your email provider
   - Update GitHub Actions secret `SMTP_PASS`

4. **Clean git history** (optional but recommended):
   ```powershell
   # Using git-filter-repo (safer than git filter-branch)
   # Install: pip install git-filter-repo
   git filter-repo --path .env --invert-paths
   git push --force-with-lease origin main
   ```
   **Warning**: Force-push rewrites history. Notify all collaborators before doing this.

---

## ✅ Prevention: Proper Secret Management

### 1. .env File (Local Development Only)

**Create `.env` locally** (never commit):
```bash
# .env (LOCAL ONLY - DO NOT COMMIT)
NODE_ENV=development
PORT=4000
SESSION_SECRET=$(openssl rand -hex 32)
HUGGINGFACE_API_KEY=your_token_here
SMTP_HOST=smtp.yourprovider.com
SMTP_PORT=587
SMTP_USER=admin@yourorg.org
SMTP_PASS=your_smtp_password
SMTP_FROM=noreply@yourorg.org
```

### 2. .gitignore (Exclude Secrets)

Verify [.gitignore](.gitignore) includes:
```
# Environment & Secrets
.env
.env.local
.env.*.local
*.key
*.pem
/backend/uploads/**
/backend/data/*.db
node_modules/
```

After fixing `.gitignore`, remove cached files:
```powershell
git rm --cached .env
git commit -m "Remove .env from tracking"
```

### 3. env.example (Safe Template)

[env.example](env.example) shows structure without secrets:
```bash
# Environment
NODE_ENV=development

# Server
PORT=4000
SESSION_SECRET=change-me-please

# AI Assistant (Hugging Face)
HUGGINGFACE_API_KEY=your_huggingface_api_key_here

# SMTP
SMTP_HOST=smtp.yourprovider.com
SMTP_PORT=587
SMTP_USER=smtp-username
SMTP_PASS=smtp-password
SMTP_FROM=no-reply@yourorg.org
```

---

## 🔐 GitHub Actions Secrets (CI/CD)

### Required Repository Secrets

In GitHub repo settings (`Settings` → `Secrets and variables` → `Actions`):

| Secret Name | Purpose | Where Used |
|---|---|---|
| `SESSION_SECRET` | Express session encryption key | CI job (server startup) |
| `HUGGINGFACE_API_KEY` | AI tutor API access | `backend/services/ai-helper.js` |
| `SMTP_HOST` | Email SMTP server hostname | Email sending (optional) |
| `SMTP_USER` | Email account username | Email sending (optional) |
| `SMTP_PASS` | Email account password | Email sending (optional) |
| `SMTP_FROM` | Email "from" address | Email sending (optional) |
| `CI_PASSWORD` | Test user password for E2E | `tools/create_ci_user.js`, `tools/e2e_focus_test.js` |

### How to Add a Secret

1. Go to **GitHub** → repo → `Settings` → `Secrets and variables` → `Actions`
2. Click **`New repository secret`**
3. Name: `SESSION_SECRET` (or other secret name)
4. Value: Paste the actual secret value
5. Click **`Add secret`**

### Safe Usage in Workflows

✅ **Good**: Reference as `${{ secrets.SESSION_SECRET }}`
```yaml
env:
  SESSION_SECRET: ${{ secrets.SESSION_SECRET }}
  HUGGINGFACE_API_KEY: ${{ secrets.HUGGINGFACE_API_KEY }}
```

❌ **Bad**: Never log or echo secrets
```yaml
# DO NOT DO THIS in a workflow
- name: Debug
  run: echo "Secret is ${{ secrets.SESSION_SECRET }}"  # ❌ EXPOSED IN LOGS
```

---

## 🛡️ Production Security Checklist

### Environment Variables

- [ ] `.env` is in `.gitignore` and never committed
- [ ] All production secrets stored in GitHub Actions secrets (not `.env`)
- [ ] Production `.env` managed via environment (e.g., Docker secrets, cloud provider)
- [ ] `SESSION_SECRET` is cryptographically random (32+ bytes hex)
- [ ] `SESSION_SECRET` is unique per environment (dev, staging, prod)

### API Keys & Tokens

- [ ] `HUGGINGFACE_API_KEY` has minimal scopes (read-only if possible)
- [ ] API keys are rotated every 90 days
- [ ] Revoked keys are tested for actual revocation
- [ ] No API keys in commit messages or PR descriptions

### SMTP & Email

- [ ] SMTP credentials use app-specific passwords (not account passwords)
- [ ] SMTP connection uses TLS/SSL (port 587 or 465, not 25)
- [ ] Email is rate-limited (avoid spam triggers)

### Database

- [ ] SQLite database (`project.db`) is excluded from git (`.gitignore`)
- [ ] Backups are encrypted and stored securely
- [ ] Database credentials (if external) are store as secrets

### Session & Cookies

- [ ] `SessionStore` uses `connect-sqlite3` with separate DB
- [ ] Cookies use `secure: true` and `sameSite: 'Lax'` in production
- [ ] Session timeout is enforced (default 24 hours)
- [ ] Sessions table (`sessions`) is periodically cleaned

### Rate Limiting & CORS

- [ ] `/api/signin` rate-limited (5 requests/minute per IP)
- [ ] `/api/signup` rate-limited (3 requests/minute per IP)
- [ ] File uploads limited to 500MB max and 3 requests/minute
- [ ] CORS headers properly scoped (not `*`)

### Logging & Monitoring

- [ ] No secrets logged (check `logger.js` and backend routes)
- [ ] Pino logs to JSON (structured, filterable)
- [ ] Sensitive fields (passwords, tokens) never logged
- [ ] Production logs stored securely and rotated

### Security Headers

- [ ] Helmet CSP configured in `backend/server.js`
- [ ] X-Frame-Options prevents clickjacking
- [ ] X-Content-Type-Options prevents MIME sniffing
- [ ] Strict-Transport-Security (HSTS) enabled for HTTPS

### Code & Dependency Security

- [ ] `npm ci` used in CI (not `npm install`)
- [ ] Dependencies pinned to exact versions (not `^` or `~`)
- [ ] DevDependencies excluded from production
- [ ] No dependencies with known high-severity CVEs

---

## 📋 Secret Scanning Workflow

The [`.github/workflows/secret-scan.yml`](.github/workflows/secret-scan.yml) uses **gitleaks** to detect credentials:

```yaml
- name: Run gitleaks
  uses: zricethezav/gitleaks-action@v2
  with:
    args: '--path=. --report-format=json --redact --leaks-exit-code=1'
```

### Preventing False Positives

1. **Add gitleaks.toml** to ignore safe secret-like patterns:
   ```toml
   [allowlist]
   # Ignore test credentials (example.test domain)
   regexes = [
     "example\\.test",
     "ci-session-secret"
   ]
   ```

2. **Commit gitleaks config**:
   ```powershell
   git add gitleaks.toml
   git commit -m "chore: add gitleaks ignore patterns"
   ```

---

## 🔄 CI/CD Secret Injection

The [`ci.yml`](.github/workflows/ci.yml) workflow safely injects secrets:

```yaml
- name: Run tests
  env:
    SESSION_SECRET: ${{ secrets.SESSION_SECRET }}
    HUGGINGFACE_API_KEY: ${{ secrets.HUGGINGFACE_API_KEY }}
  run: npm run smoke
```

**How it works**:
1. Secret is not visible in workflow file
2. GitHub Actions provides secret value at runtime
3. Secret is masked in logs (appears as `***`)
4. Secret is passed to subprocess via environment variable

---

## 🚀 Production Deployment Secrets

### Docker Deployment

Pass secrets as build args:
```bash
docker build \
  --build-arg SESSION_SECRET='your-prod-secret' \
  --build-arg HUGGINGFACE_API_KEY='your-prod-key' \
  -t your-app:prod .
```

Or use `.env.prod` mounted at runtime (encrypted):
```bash
docker run --env-file .env.prod.encrypted your-app:prod
```

### PM2 / Direct Server

Use environment variables (not `.env`):
```bash
export SESSION_SECRET='your-prod-secret'
export HUGGINGFACE_API_KEY='your-prod-key'
npm start
```

Or use PM2 ecosystem file:
```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'app',
    script: 'backend/server.js',
    env: {
      NODE_ENV: 'production',
      PORT: 5000,
      SESSION_SECRET: process.env.SESSION_SECRET,
      HUGGINGFACE_API_KEY: process.env.HUGGINGFACE_API_KEY
    }
  }]
};
```

### Cloud Platforms (DigitalOcean, AWS, Azure, etc.)

Use native secret management:
- **DigitalOcean App Platform**: Secrets in `.do/app.yaml`
- **AWS Lambda**: AWS Secrets Manager
- **Azure App Service**: Key Vault
- **Heroku**: Config Vars

Never commit platform-specific secrets; reference them in CI/CD via GitHub Actions.

---

## 📖 References

- [OWASP: Secrets Management](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)
- [gitleaks Documentation](https://github.com/gitleaks/gitleaks)
- [GitHub Actions Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [Helmet.js Security Headers](https://helmetjs.github.io/)
- [bcrypt Password Hashing](https://github.com/kelektiv/node.bcrypt.js)

---

## 🎯 Summary

| Layer | Tool/Method | When |
|---|---|---|
| **Development** | `.env` file (gitignored) | Local machine only |
| **Staging/Test** | GitHub Actions secrets | CI/CD pipeline |
| **Production** | Environment variables or platform secrets | Deploy time |
| **Scanning** | gitleaks workflow | Every push/PR |
| **Rotation** | Manual or scheduled job | Every 90 days min |

**Key Takeaway**: Never commit secrets to git. Use platform-specific secret management and inject at runtime.
