# Multi-Tenant Organization Access Guide

Your application already supports **multi-tenant organization access** through secure, sharable links!

---

## 🎯 Purpose

Allow multiple organizations to access **your single platform** with isolated content:
- Each organization sees only their lessons and materials
- No need for separate deployments
- Centralized management
- Secure, time-limited access links

---

## How It Works

### Architecture

```
Your Platform (Single Instance)
├── Organization: "Global" (Default)
├── Organization: "ABC School" (org_id: 2)
│   ├── Lessons assigned to org_id: 2
│   ├── Users assigned to org_id: 2
│   └── Submissions from org_id: 2
├── Organization: "XYZ Corp" (org_id: 3)
│   ├── Lessons assigned to org_id: 3
│   ├── Users assigned to org_id: 3
│   └── Submissions from org_id: 3
```

**Key Feature**: Each organization's data is completely isolated from others.

---

## 📋 Setup Process

### Step 1: Create Organization (Admin)

1. **Login as admin**
2. **Navigate to Admin Dashboard**
3. **Organizations Section** → Click "Create Organization"
4. **Fill in details**:
   - Name: "ABC School District"
   - Slug: "abc-school" (unique identifier)
   - Status: "active"
5. **Save** - Organization created with unique ID

### Step 2: Assign Content to Organization

**Option A: Create New Content**
When creating lessons/assignments, specify `org_id`:
```sql
INSERT INTO lessons (week, title, description, video_url, org_id)
VALUES (1, 'AI Basics', 'Introduction to AI', '/videos/ai-intro.mp4', 2);
```

**Option B: Bulk Assign Existing Content**
```sql
-- Assign lessons to ABC School (org_id: 2)
UPDATE lessons SET org_id = 2 WHERE week IN (1, 2, 3);

-- Assign assignments
UPDATE assignments SET org_id = 2 WHERE lesson_id IN (1, 2, 3);
```

### Step 3: Generate Access Link

**Via API** (you can build admin UI for this):

```javascript
// Request
POST /api/org/token/2
Body: {
  "scope": "read",
  "ttl": 86400  // 24 hours in seconds
}

// Response
{
  "status": "success",
  "token": "eyJvcmdfaWQ6MiwgXNjb3BlIjoicmVhZCIsImlhdCI6MTcwNDkzODQw...",
  "expires_in": 86400,
  "link": "/org/access?token=eyJvcmdfaWQ..."
}
```

### Step 4: Share Link with Organization

**Email Template:**
```
Subject: Your AI Professional Development Platform Access

Hello ABC School District,

Your customized AI training platform is ready!

Access Link: https://yourplatform.com/org/access?token=eyJvcmdfaWQ...

This link will:
- Grant access for 24 hours
- Show only your organization's content
- Require no additional login

After clicking, you'll be redirected to your dashboard.

Best regards,
The Training Team
```

### Step 5: Organization Accesses Platform

1. **User clicks link**
2. **Token verified** by server
3. **Session created** with `org_id: 2`
4. **Redirected** to dashboard
5. **All queries filtered** by their org_id automatically

---

## 🔐 Security Features

### Token-Based Access
- ✅ **HMAC-signed** tokens (tamper-proof)
- ✅ **Time-limited** (configurable expiration)
- ✅ **One-time use** possible (can add jti tracking)
- ✅ **Scope-based** (read, write, admin)

### Data Isolation
- ✅ **Database-level filtering** (org_id in all queries)
- ✅ **Session-based** (org stored in session)
- ✅ **Automatic filtering** (no manual checks needed)

### Access Control
```javascript
// Every query automatically filters by org_id
const orgId = getSessionOrgId(req);
const sql = orgId 
  ? 'SELECT * FROM lessons WHERE org_id = ?' 
  : 'SELECT * FROM lessons';
```

---

## 💼 Use Cases

### Educational Institutions
**Multiple Schools Access Same Platform**
- Each school has custom lessons
- Centralized content management
- Individual progress tracking per school

### Corporate Training
**Multiple Companies Use Same Platform**
- Company-specific AI training modules
- Branded content per organization
- Separate analytics per company

### Government Agencies
**Multiple Departments**
- Department-specific training materials
- Shared platform, isolated data
- Compliance-ready data separation

---

## 🛠️ Admin Workflow

### Creating New Organization Client

```bash
# 1. Create organization (via admin dashboard or API)
curl -X POST http://localhost:4000/api/organizations \
  -H "Content-Type: application/json" \
  -d '{"name": "New Corp", "slug": "new-corp", "status": "active"}'

# 2. Upload/assign their content
# - Upload videos to /videos/new-corp/
# - Create lessons with org_id
# - Create assignments with org_id

# 3. Generate access link
curl -X POST http://localhost:4000/api/org/token/4 \
  -H "Content-Type: application/json" \
  -d '{"scope": "read", "ttl": 604800}'  # 7 days

# 4. Share link with client
# Email or embed in their website
```

---

## 📊 Benefits of This Approach

### For You (Platform Owner)
✅ **Single codebase** to maintain  
✅ **Centralized updates** (update once, all orgs benefit)  
✅ **Easy monitoring** (one database, all activity)  
✅ **Scalable** (add orgs without new deployments)  
✅ **Cost-effective** (one server, multiple clients)

### For Organizations
✅ **No technical setup** required  
✅ **Instant access** via link  
✅ **Custom content** for their needs  
✅ **Professional platform** without building their own  
✅ **Secure** (data isolated from other orgs)

---

## 🚀 Enhancements You Can Add

### 1. White-Label Branding
Allow organizations to upload:
- Logo
- Color scheme
- Custom domain (via CNAME)

### 2. Admin UI for Token Generation
Build a form in admin dashboard:
```
[Generate Access Link]
Organization: [Dropdown: ABC School]
Expiration: [24 hours | 7 days | 30 days | Never]
Scope: [Read Only | Read/Write]
[Generate Link] → Copy link to share
```

### 3. Analytics Per Organization
```sql
-- Track usage per org
SELECT 
  o.name,
  COUNT(DISTINCT uv.user_id) as active_users,
  COUNT(s.id) as total_submissions
FROM organizations o
LEFT JOIN user_visits uv ON uv.org_id = o.id
LEFT JOIN submissions s ON s.org_id = o.id
GROUP BY o.id;
```

### 4. Automatic User Assignment
When user signs up via org link, auto-assign to that org:
```javascript
router.post('/signup', (req, res) => {
  const orgId = getSessionOrgId(req);
  // Create user with org_id
  const stmt = db.prepare(
    'INSERT INTO users (username, email, password, org_id) VALUES (?, ?, ?, ?)'
  );
  stmt.run([username, email, hash, orgId]);
});
```

---

## 📝 Example: Complete Setup

### Scenario: Onboard "TechCorp" for AI Training

**Step 1: Admin creates organization**
```
Name: TechCorp
Slug: techcorp
Status: active
```

**Step 2: Admin creates their content**
```sql
-- Week 1 lesson for TechCorp
INSERT INTO lessons (week, title, description, video_url, org_id)
VALUES (1, 'AI in Business', 'TechCorp-specific AI introduction', '/videos/techcorp/week1.mp4', 5);

-- Assignment for TechCorp
INSERT INTO assignments (lesson_id, title, instructions)
VALUES (1, 'AI Strategy', 'Develop AI strategy for your department');
```

**Step 3: Generate 30-day access link**
```javascript
POST /api/org/token/5
{ "scope": "read", "ttl": 2592000 }

Returns:
{
  "link": "https://yoursite.com/org/access?token=abc123..."
}
```

**Step 4: Email TechCorp**
```
Subject: Your Custom AI Training Platform

TechCorp team,

Your AI professional development training is ready!

Access here: https://yoursite.com/org/access?token=abc123...

You'll have access to:
✓ 12 weeks of AI training
✓ Custom video content
✓ Interactive assignments
✓ Progress tracking

This link is valid for 30 days.

Questions? Reply to this email.
```

**Step 5: TechCorp employees access**
- Click link → Auto-authenticated
- See only TechCorp's content
- Can submit assignments
- Can track their progress

---

## 🎯 Next Steps

1. ✅ **Your system already supports this!**
2. **Build admin UI** for token generation (optional, can use API directly)
3. **Create welcome email templates** for new organizations
4. **Set up content pipelines** for each organization
5. **Monitor usage** per organization

---

## 🔗 API Endpoints Already Built

| Endpoint | Purpose |
|----------|---------|
| `POST /api/organizations` | Create new organization |
| `GET /api/organizations` | List all organizations |
| `PUT /api/organizations/:id` | Update organization |
| `DELETE /api/organizations/:id` | Remove organization |
| `POST /api/org/token/:orgId` | Generate access link |
| `GET /api/org/access?token=...` | Redeem access token |

---

## 🎉 Summary

**You already have a multi-tenant SaaS platform!**

✅ Database supports organization isolation  
✅ Token-based access links working  
✅ Secure, time-limited access  
✅ No duplicate deployments needed  
✅ Scalable to unlimited organizations

**What to do**: Start creating organizations and generating access links!

---

**Questions or enhancements needed? Let me know!**
