# Secret Rotation Checklist

**Frequency**: Every 90 days (or after suspected compromise)  
**Owner**: DevOps / Security lead  
**Duration**: ~15–30 minutes

---

## Pre-Rotation Tasks

- [ ] Notify stakeholders of planned rotation window
- [ ] Schedule during low-traffic hours (if applicable)
- [ ] Have rollback plan ready (old secrets stored temporarily)
- [ ] Ensure all deployed environments documented

---

## SESSION_SECRET Rotation

**Impact**: Forces all users to re-login (invalidates sessions)

### Steps

1. **Generate new secret**:
   ```powershell
   # Windows
   $bytes = [byte[]]::new(32)
   [System.Security.Cryptography.RNGCryptoServiceProvider]::new().GetBytes($bytes)
   [BitConverter]::ToString($bytes).Replace('-','').ToLower()
   ```
   Or:
   ```bash
   # Linux/Mac
   openssl rand -hex 32
   ```

2. **Update GitHub Actions secret**:
   - Go to: Repo → `Settings` → `Secrets and variables` → `Actions`
   - Click `SESSION_SECRET` → Click `Update`
   - Paste new secret value
   - Click `Update secret`

3. **Update production environment**:
   - If using Docker: redeploy containers
   - If using PM2: update `ecosystem.config.js` and restart
   - If using cloud platform: update environment variables

4. **Verify rotation**:
   - Smoke tests pass: `npm run smoke`
   - Users can log back in after session invalidation
   - Check server logs for errors

5. **Document**:
   - Record date and time of rotation
   - Note any issues encountered

---

## HUGGINGFACE_API_KEY Rotation

**Impact**: AI tutor temporarily unavailable during switch-over (graceful degradation)

### Steps

1. **Generate new token**:
   - Go to: https://huggingface.co/settings/tokens
   - Click `New token`
   - Set scope to `read` (minimal)
   - Set expiration to `90 days`
   - Click `Generate a token`
   - Copy token (looks like: `YOUR_HUGGINGFACE_TOKEN`)

2. **Test new token locally**:
   ```bash
   # In local .env
   HUGGINGFACE_API_KEY=hf_new_token_here
   npm run smoke -- --quick
   ```
   Verify AI endpoint responds (or gracefully errors if no quota)

3. **Update GitHub Actions secret**:
   - Go to: Repo → `Settings` → `Secrets and variables` → `Actions`
   - Click `HUGGINGFACE_API_KEY` → Click `Update`
   - Paste new token
   - Click `Update secret`

4. **Deploy new token**:
   - Trigger new CI/CD run to propagate token
   - Verify production AI tutor works or fails gracefully

5. **Revoke old token**:
   - Go to: https://huggingface.co/settings/tokens
   - Find old token
   - Click `Delete`

6. **Document**:
   - Record new token expiration date (mark calendar for next rotation)
   - Store old token securely temporarily (if roll-back needed)

---

## SMTP Credentials Rotation

**Impact**: Email features temporarily unavailable during switch-over

### Steps

1. **Change email account password** (in your email provider):
   - Microsoft 365 / Office 365
   - Gmail (use App Password if 2FA enabled)
   - SendGrid / Mailgun
   - Custom provider

2. **Test new credentials locally**:
   ```bash
   # In local .env
   SMTP_HOST=smtp.yourprovider.com
   SMTP_USER=admin@yourorg.org
   SMTP_PASS=new_password_here
   
   # Manual test: Try sending a test email via the app
   ```

3. **Update GitHub Actions secrets**:
   - Update `SMTP_USER`, `SMTP_PASS`, `SMTP_HOST`, `SMTP_FROM` as needed
   - Verify each secret is set

4. **Deploy updated credentials**:
   - Trigger new CI/CD run or manual deployment
   - Test email functionality (password reset flow)

5. **Revoke old credentials**:
   - Delete or disable old app password in email provider
   - Verify old credentials no longer work

6. **Document**:
   - Record password change date
   - Update runbook with new credentials location

---

## CI_PASSWORD Rotation

**Impact**: E2E tests use new credentials going forward

### Steps

1. **Generate new password**:
   - Meets requirements: 8+ chars, uppercase, lowercase, number, special char
   - Example: `NewCiPass2026!`

2. **Update GitHub Actions secret**:
   - Go to: Repo → `Settings` → `Secrets and variables` → `Actions`
   - Click `CI_PASSWORD` → Click `Update`
   - Paste new password
   - Click `Update secret`

3. **Update local test user**:
   ```powershell
   $env:CI_PASSWORD='NewCiPass2026!'
   node tools/create_ci_user.js
   ```

4. **Run E2E tests**:
   ```powershell
   # Trigger CI workflow or run locally
   npm run smoke:auth
   # or
   node tools/e2e_focus_test.js
   ```

5. **Document**:
   - Record new password policy

---

## Rate Limit Token Rotation (if applicable)

If using third-party rate-limit or quota APIs:

- [ ] Check current quota usage
- [ ] Rotate API keys if limits approached
- [ ] Document quota reset date

---

## Post-Rotation Verification

- [ ] All GitHub Actions secrets updated
- [ ] CI/CD pipeline runs successfully
- [ ] Production deployment healthy
- [ ] Error logs monitored for auth failures
- [ ] Smoke tests pass
- [ ] E2E tests pass
- [ ] Users can sign in and use app
- [ ] Email features work (if SMTP enabled)
- [ ] AI tutor responds (if Hugging Face enabled)

---

## Rollback Procedure (If Needed)

1. **Revert secret in GitHub Actions**:
   - Click secret → `Update`
   - Paste old value
   - Click `Update secret`

2. **Redeploy**:
   - Trigger CI/CD to propagate old secret
   - Verify services recover

3. **Post-Mortem**:
   - Identify what failed
   - Fix and retry rotation

---

## Audit & Logging

- [ ] Rotation recorded in git commit (e.g., `chore: rotate secrets`)
- [ ] Slack/Teams notification sent to team
- [ ] Monitoring dashboard checked for anomalies
- [ ] No errors in production logs related to auth

---

## Emergency Secret Revocation

If a secret is compromised outside the rotation window:

1. **Immediate**: Revoke compromised secret in provider
2. **Urgent**: Update GitHub Actions secret with new value
3. **Deploy**: Trigger emergency deployment
4. **Notify**: Alert affected users if applicable
5. **Investigation**: Post-mortem to prevent future leaks

See [SECURITY_SECRETS_GUIDE.md](SECURITY_SECRETS_GUIDE.md) for comprehensive security practices.
