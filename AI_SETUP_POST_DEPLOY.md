# Post-Deployment: Hugging Face AI Setup

**Date**: February 18, 2026  
**Status**: Ready for activation  
**Purpose**: Enable AI tutor feature after main deployment

---

## Current State

- ✅ **Code**: AI helper integration is complete ([backend/services/ai-helper.js](backend/services/ai-helper.js))
- ✅ **API Routes**: AI endpoints ready in [backend/routes/api.js](backend/routes/api.js)
- ✅ **Error Handling**: Graceful degradation if key missing or invalid
- ✅ **Rate Limiting**: 10 questions/user/hour enforced in database
- ⏳ **API Key**: New key added to `.env` (verify activation in production)

---

## Deployment Checklist

### 1. Verify API Key Status

After deploying `main` to production:

1. Go to: https://huggingface.co/settings/tokens
2. Find token: `<REDACTED_TOKEN>` (or note its name)
3. Check:
   - Status: **Active** (green checkmark)
   - Quota: Requests remaining > 0 (free tier: 30K/month)
   - Expiration: Not expired

**If expired or no quota:**
- Generate new token at https://huggingface.co/settings/tokens
- Follow steps in [SECURITY_SECRETS_GUIDE.md](SECURITY_SECRETS_GUIDE.md) under "HUGGINGFACE_API_KEY Rotation"

### 2. Update GitHub Actions Secret (CI/CD)

Once you have a **confirmed working** Hugging Face API key:

1. Go to GitHub repo → `Settings` → `Secrets and variables` → `Actions`
2. Click `New repository secret`
3. Name: `HUGGINGFACE_API_KEY`
4. Value: Paste your active token (starts with `hf_`)
5. Click `Add secret`

### 3. Trigger CI to Activate

1. Push a small change to `main` (e.g., update `.env` comment)
2. GitHub Actions workflow will run with the new secret
3. AI endpoints will activate automatically

### 4. Test AI Feature

Once deployed, test AI endpoints:

```bash
# Test lesson help
curl -X POST http://localhost:5000/api/ai/lesson-help \
  -H "Content-Type: application/json" \
  -d '{
    "lessonId": 1,
    "question": "What is machine learning?"
  }' \
  -b "connect.sid=<session-cookie>"

# Response format:
# {
#   "status": "success",
#   "data": {
#     "answer": "Machine learning is...",
#     "remainingQuestions": 9
#   }
# }
```

**Without valid API key (graceful degradation):**
```json
{
  "status": "error",
  "message": "AI assistance is currently unavailable. Please contact your administrator."
}
```

---

## Troubleshooting

### Issue: "AI usage limit reached"
- **Cause**: 10 questions/hour per user exceeded
- **Solution**: User can retry after 1 hour

### Issue: "Model loading" / 504 Gateway Timeout
- **Cause**: Hugging Face model cold-starting (first request after deployment)
- **Solution**: Retry after 30 seconds (automatic with fallback)

### Issue: "API key not configured"
- **Cause**: `HUGGINGFACE_API_KEY` secret not set in GitHub Actions
- **Solution**: Add secret per **Step 2** above

### Issue: Network error / 404 from router
- **Cause**: Old API key exhausted quota or revoked
- **Solution**: Generate fresh key from https://huggingface.co/settings/tokens and update GitHub Actions secret

---

## Production Security Notes

✅ **What we do:**
- No secrets in `.env` committed to git
- API key stored in GitHub Actions secrets (encrypted)
- Key rotated every 90 days (See [SECRET_ROTATION_CHECKLIST.md](SECRET_ROTATION_CHECKLIST.md))
- Rate limiting enforced per user per hour (stored in DB)
- AI responses logged to `ai_usage` table for audit

❌ **What NOT to do:**
- Never log API keys or responses to stdout
- Never commit `.env` with real secrets
- Never share API key in issues or PRs

---

## Monitoring & Maintenance

### Check AI Usage

```sql
-- SQLite: See how many AI questions users have asked
SELECT 
  user_id, 
  COUNT(*) as question_count, 
  MAX(created_at) as last_question
FROM ai_usage
WHERE DATE(created_at) = DATE('now')
GROUP BY user_id;
```

### Rotate Key (Every 90 days)

Follow [SECRET_ROTATION_CHECKLIST.md](SECRET_ROTATION_CHECKLIST.md#huggingface_api_key-rotation)

### Monitor Costs

- **Free Tier**: 30,000 requests/month (usually sufficient for small classes)
- **Paid Tier**: If exceeded, consider upgrading or caching common questions

---

## References

- [Hugging Face Documentation](https://huggingface.co/docs)
- [Hugging Face API Pricing](https://huggingface.co/pricing)
- [Security & Secrets Guide](SECURITY_SECRETS_GUIDE.md)
- [Secret Rotation Checklist](SECRET_ROTATION_CHECKLIST.md)
- [AI Helper Service](backend/services/ai-helper.js)
- [AI Routes](backend/routes/api.js)

---

## Summary

| Task | Status | Timeline |
|---|---|---|
| Code deployment | ✅ Complete | Now |
| API key verification | ⏳ Post-deploy | +15 min |
| GitHub Actions secret update | ⏳ Post-deploy | +5 min |
| AI feature activation | ⏳ After CI runs | +5 min after secret update |
| Testing | ⏳ Optional | +10 min |

**Expected timeline to full AI activation: ~30 minutes post-deployment**
