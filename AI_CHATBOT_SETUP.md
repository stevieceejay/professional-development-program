# AI Chatbot Setup Guide

Complete guide to enabling the AI Tutor and Admin Assistant features using Hugging Face (FREE!).

---

## What You Get

✅ **Student AI Tutor** - Answers questions about lessons 24/7  
✅ **Admin AI Assistant** - Helps navigate platform features without embarrassment  
✅ **Assignment Feedback** - Pre-submission review and suggestions  
✅ **Concept Simplifier** - Explains difficult topics in simple terms  
✅ **30,000 FREE requests/month** - Plenty for 100+ students  

---

## Step 1: Get Your Free Hugging Face API Key

### Create Account

1. **Go to**: https://huggingface.co/join
2. **Sign up** with:
   - Email: stephenjohnson118120@gmail.com
   - Username: (your choice)
   - Password: (save it!)
3. **Verify email** - Check inbox and click verification link

### Generate API Key

1. **Go to**: https://huggingface.co/settings/tokens
2. Click **"New token"**
3. **Name**: `Professional-Dev-Platform`
4. **Type**: Select **"Read"** (sufficient for inference)
5. Click **"Generate a token"**
6. **Copy the token** - Looks like: `hf_aBcDeFgHiJkLmNoPqRsTuVwXyZ123456789`
7. **SAVE IT!** - You can't see it again

---

## Step 2: Add API Key to Your App

### Update .env File

```powershell
# On your Windows machine
cd C:\Users\NewAdmin\Documents\ARG-professional-developement\backend

# Open .env in notepad
notepad .env
```

**Add this line** (replace with YOUR actual token):
```env
HUGGINGFACE_API_KEY=hf_aBcDeFgHiJkLmNoPqRsTuVwXyZ123456789
```

**Save and close** notepad

---

## Step 3: Install Dependencies

```powershell
# In your project directory
cd C:\Users\NewAdmin\Documents\ARG-professional-developement

# Install node-fetch (required for AI service)
npm install node-fetch@2.7.0

# Verify installation
npm list node-fetch
```

---

## Step 4: Create Database Table

```powershell
# Open SQLite database
sqlite3 backend/data/project.db

# Paste this SQL:
CREATE TABLE IF NOT EXISTS ai_usage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  org_id INTEGER,
  type TEXT NOT NULL,
  question TEXT,
  response TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE SET NULL
);

CREATE INDEX idx_ai_usage_user ON ai_usage(user_id);
CREATE INDEX idx_ai_usage_org ON ai_usage(org_id);
CREATE INDEX idx_ai_usage_type ON ai_usage(type);
CREATE INDEX idx_ai_usage_created ON ai_usage(created_at);

# Press Ctrl+D to exit (or type .quit)
.quit
```

**Or use the migration file**:
```powershell
sqlite3 backend/data/project.db < backend/data/migrations/add_ai_usage.sql
```

---

## Step 5: Test the AI Features

### Start Server

```powershell
npm start
```

**Look for**:
```
Server listening on http://localhost:4000
```

### Test Student AI Tutor

1. **Open**: http://localhost:4000/lessons.html
2. **Sign in** (or create account)
3. **Select a week** (e.g., Week 1)
4. **Click** "🤖 Ask AI Tutor" button
5. **Type a question**: "What is this lesson about?"
6. **Click "Ask"**
7. **Wait 2-5 seconds** - AI responds!

### Test Admin AI Assistant

1. **Open**: http://localhost:4000/admin-dashboard.html
2. **Sign in as admin**
3. **Click** floating 🤖 button (bottom-right corner)
4. **Ask**: "How do I create an organization?"
5. **Get instant help!**

---

## Features Available

### For Students (lessons.html)

**AI Tutor Chat**:
- Button: "🤖 Ask AI Tutor"
- Questions about current lesson
- Instant explanations
- 10 questions per hour

**Future Features** (already coded, just needs frontend):
- Assignment feedback: `/api/ai/assignment-feedback`
- Concept simplifier: `/api/ai/simplify`

### For Admins (admin-dashboard.html)

**AI Assistant Widget**:
- Floating 🤖 button (always visible)
- Questions about platform management
- Step-by-step instructions
- No embarrassment asking basic questions

---

## Usage Limits & Costs

### Free Tier (Hugging Face)
- **30,000 requests per month**
- **Enough for**:
  - 100 students × 10 questions each = 1,000/month
  - 10 admins × 20 questions each = 200/month
  - **Total: 1,200/month used** (only 4% of limit!)

### Rate Limiting (Built-In)
- **10 questions per user per hour**
- Prevents abuse
- Resets automatically
- Shows remaining count

### No Credit Card Required!
- Free forever (within limits)
- No surprise charges
- Can upgrade later if needed

---

## Troubleshooting

### "AI assistance is currently unavailable"

**Check .env file**:
```powershell
notepad backend\.env
```
Make sure `HUGGINGFACE_API_KEY=` has your actual token

**Restart server**:
```powershell
# Stop server (Ctrl+C)
npm start
```

### "Rate limit reached"

**Wait 1 hour** - Limit resets automatically

**Check usage**:
```sql
sqlite3 backend/data/project.db
SELECT COUNT(*) FROM ai_usage WHERE user_id = 1 AND created_at > datetime('now', '-1 hour');
.quit
```

### "Unable to generate response"

**Check Hugging Face status**: https://status.huggingface.co/

**Try fallback model** - Already configured automatically

**Check API key**:
1. Go to: https://huggingface.co/settings/tokens
2. Verify token is active
3. Generate new token if needed

### "Network error"

**Check internet connection**

**Test API key manually**:
```powershell
curl -X POST https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2 `
  -H "Authorization: Bearer YOUR_API_KEY" `
  -H "Content-Type: application/json" `
  -d '{"inputs": "Hello, how are you?"}'
```

---

## Upgrade Options (If You Outgrow Free Tier)

### Hugging Face Pro
- **Cost**: $9/month
- **Benefit**: Faster inference, priority access
- **When**: If you exceed 30K requests/month

### OpenAI (Better Quality)
- **Cost**: ~$2-5/month for 100 students
- **Benefit**: Higher quality responses
- **Setup**: Change `ai-helper.js` to use OpenAI API
- **Get key**: https://platform.openai.com/api-keys

### Custom Model (Advanced)
- **Cost**: $5-20 one-time + $5/month hosting
- **Benefit**: Specialized for your content
- **When**: 1000+ students

---

## Monitoring AI Usage

### Check Total Usage

```sql
sqlite3 backend/data/project.db
SELECT type, COUNT(*) as count FROM ai_usage GROUP BY type;
.quit
```

### Check Usage by User

```sql
SELECT u.username, COUNT(*) as questions
FROM ai_usage a
JOIN users u ON a.user_id = u.id
GROUP BY u.username
ORDER BY questions DESC;
```

### Check Usage This Month

```sql
SELECT DATE(created_at) as date, COUNT(*) as questions
FROM ai_usage
WHERE created_at >= date('now', 'start of month')
GROUP BY DATE(created_at);
```

---

## Security Notes

✅ **Rate limiting**: 10 questions/hour per user (prevents abuse)  
✅ **Input sanitization**: All questions cleaned before sending  
✅ **Character limits**: Questions max 500 chars, submissions max 2000 chars  
✅ **Authentication required**: Must be signed in  
✅ **Usage logging**: All AI requests tracked in database  
✅ **Org isolation**: AI responses respect org boundaries  

---

## What's Next

### Phase 1: Current (DONE ✅)
- Student lesson Q&A
- Admin platform help
- Rate limiting
- Usage tracking

### Phase 2: Add These Features
- Assignment feedback button on submission page
- "Simplify this concept" button in lessons
- Quiz generator for self-assessment
- Progress encouragement messages

### Phase 3: Advanced (Optional)
- Fine-tuned model on your content
- Voice-to-text questions (mobile)
- Multi-language support
- Personalized learning paths

---

## Quick Reference

**API Endpoints**:
- `/api/ai/lesson-help` - Student questions about lessons
- `/api/ai/admin-help` - Admin platform navigation
- `/api/ai/assignment-feedback` - Pre-submission review
- `/api/ai/simplify` - Explain concepts simply

**Files Modified**:
- `backend/services/ai-helper.js` - AI integration service
- `backend/routes/api.js` - AI endpoints (4 new routes)
- `frontend/public/lessons.html` - Student AI tutor widget
- `frontend/public/admin-dashboard.html` - Admin AI assistant
- `package.json` - Added node-fetch dependency
- `env.example` - Added HUGGINGFACE_API_KEY template

**Database Table**:
- `ai_usage` - Tracks all AI requests with timestamps

---

## Support

**Hugging Face Docs**: https://huggingface.co/docs/api-inference/index  
**Model Info**: https://huggingface.co/mistralai/Mistral-7B-Instruct-v0.2  
**API Status**: https://status.huggingface.co/  

**Questions**: stephenjohnson118120@gmail.com

---

**You now have a FREE AI-powered education platform! 🚀**

Students get 24/7 tutoring, admins get instant help, and you save time answering repetitive questions.
