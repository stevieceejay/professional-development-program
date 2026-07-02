# AI Chatbot - Quick Start (5 Minutes)

Get your FREE AI tutor running in 5 simple steps!

---

## Step 1: Get Free API Key (2 minutes)

1. Go to: **https://huggingface.co/join**
2. Sign up (free account)
3. Go to: **https://huggingface.co/settings/tokens**
4. Click **"New token"** → Name: `my-platform` → Type: **Read** → **Generate**
5. **Copy the token** (starts with `hf_`)

---

## Step 2: Add to .env File (30 seconds)

```powershell
# Open .env in notepad
notepad backend\.env

# Add this line (paste YOUR token):
HUGGINGFACE_API_KEY=hf_paste_your_token_here

# Save (Ctrl+S) and close
```

---

## Step 3: Install Package (1 minute)

```powershell
npm install node-fetch@2.7.0
```

---

## Step 4: Create Database Table (30 seconds)

```powershell
sqlite3 backend/data/project.db < backend/data/migrations/add_ai_usage.sql
```

**Or manually**:
```powershell
sqlite3 backend/data/project.db

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

.quit
```

---

## Step 5: Test It! (1 minute)

```powershell
# Start server
npm start

# In browser, open:
http://localhost:4000/lessons.html

# Sign in, select Week 1, click "🤖 Ask AI Tutor"
# Ask: "What is this lesson about?"
# Wait 3 seconds → AI responds! 🎉
```

---

## Features Now Available

✅ **Student AI Tutor** - lessons.html → "🤖 Ask AI Tutor" button  
✅ **Admin Assistant** - admin-dashboard.html → 🤖 floating button (bottom-right)  
✅ **30,000 FREE questions/month** - Plenty for 100+ students  
✅ **10 questions per hour per user** - Prevents abuse  

---

## Troubleshooting

**"AI assistance unavailable"**  
→ Check `.env` has `HUGGINGFACE_API_KEY=hf_...`  
→ Restart server: `npm start`

**"Network error"**  
→ Check internet connection  
→ Verify API key: https://huggingface.co/settings/tokens

---

**Done! You now have FREE AI tutoring for students and admins! 🚀**

See **AI_CHATBOT_SETUP.md** for advanced features and monitoring.
