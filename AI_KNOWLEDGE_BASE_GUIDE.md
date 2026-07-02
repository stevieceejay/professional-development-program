# AI Knowledge Base Management Guide
**Professional Development Project Platform**  
*Copyright © 2026 Stephen. All Rights Reserved.*

## Overview

This guide explains how to ensure Hugging Face AI has the necessary data to resolve inquiries from both students and administrators effectively.

## Architecture

### Context Service (`backend/services/ai-context.js`)
Centralized service that loads and caches:
- **Curriculum data**: All 12 weeks of lessons from database
- **Admin documentation**: Platform features, APIs, workflows
- **Assignment context**: Grading rubrics, lesson connections
- **Topic detection**: Automatically identifies question categories

### AI Helper Service (`backend/services/ai-helper.js`)
Integrates with Hugging Face API:
- **Student tutor**: Answers lesson questions with curriculum context
- **Admin assistant**: Provides platform guidance with documentation
- **Assignment reviewer**: Gives feedback with rubric context
- **Fallback model**: Switches to backup if primary model fails

## How Context is Provided

### For Student Inquiries

When a student asks a question via `/api/ai/lesson-help`:

1. **Lesson Context Loading**
   - Fetches current lesson (title, description, video URL)
   - Loads related assignments (titles and instructions)
   - Includes curriculum overview (all 12 weeks summary)

2. **Prompt Construction**
   ```
   Week [X]: [Lesson Title]
   
   Full Lesson Details: [Complete description]
   
   Related Assignments:
   - Assignment 1: [Instructions preview]
   - Assignment 2: [Instructions preview]
   
   Program Context: [12-week curriculum overview]
   
   Student Question: [Their question]
   ```

3. **Response Guidelines**
   - Direct answer to question
   - References specific lesson content
   - Connects to career development goals
   - Actionable and encouraging

**Example Student Question:**
> "How do I create a professional email signature in Gmail?"

**AI receives context:**
- Week 2: Digital Education I - Gmail & Drive
- Full lesson description about email etiquette
- Assignment about composing professional emails
- Curriculum overview showing this is preparation for Week 11 communication skills

### For Admin Inquiries

When an admin asks a question via `/api/ai/admin-help`:

1. **Topic Detection**
   - Analyzes question for keywords: users, lessons, assignments, analytics, AI, organizations
   - Categorizes into: users, lessons, assignments, analytics, ai, organizations, general

2. **Context Loading**
   - Loads admin documentation based on detected topic
   - Includes API endpoints, UI paths, best practices
   - Provides warnings and security considerations

3. **Prompt Construction**
   ```
   Platform Administration Guide
   
   [Relevant section based on topic]:
   - User Management (if about users)
   - Lesson Management (if about lessons)
   - Assignment Management (if about assignments)
   - Analytics & Reporting (if about data)
   - Multi-Tenant Organizations (if about orgs)
   - AI Helper Features (if about AI)
   
   Admin Question: [Their question]
   ```

4. **Response Guidelines**
   - Actionable steps or API endpoints
   - UI navigation paths (Admin Dashboard → Section → Action)
   - Best practices and warnings
   - Precise and technical

**Example Admin Question:**
> "How do I add a new assignment for Week 5?"

**AI receives context:**
```
== Assignment Management ==
- Create assignment: POST /api/assignments 
  with {lesson_id, title, instructions, due_date}
- Get lesson_id: Query lessons table WHERE week = 5
- Update assignment: PUT /api/assignments/:id
- Via UI: Admin Dashboard → Assignments → Create New
```

## Data Sources

### 1. Database (SQLite)

**Lessons Table** (`lessons`)
```sql
SELECT week, title, description, video_url FROM lessons ORDER BY week
```
- Used for: Curriculum context, lesson-specific help
- Cached for: 1 hour
- Update triggers: Admin updates lesson via PUT /api/lessons/:week

**Assignments Table** (`assignments`)
```sql
SELECT a.*, l.week, l.title as lesson_title 
FROM assignments a 
JOIN lessons l ON a.lesson_id = l.id
```
- Used for: Assignment context, grading rubrics
- Update triggers: Admin creates/updates assignments

### 2. Documentation Files

**Admin Guides** (`docs/`)
- `admin-user-guide.md`: Complete platform documentation
- `curriculum_admin_guide.md`: Curriculum management
- `program_overview.md`: High-level overview

Currently **not** automatically loaded (static context used instead).  
**Enhancement opportunity**: Parse markdown files for dynamic context.

### 3. Hard-Coded Knowledge

**Week-Specific Rubrics** (`ai-context.js` line 200+)
```javascript
getWeekSpecificRubric(week) {
  const rubrics = {
    1: 'Self-Assessment: Check for honest reflection...',
    2: 'Email Skills: Proper formatting...',
    // ... weeks 3-12
  };
}
```

**Admin Documentation** (`ai-context.js` line 154+)
```javascript
context += `
== User Management ==
- View all users: Admin Dashboard → Users section
- Create user: POST /api/users with {username, email, password, role}
// ... more sections
`;
```

## Maintaining AI Knowledge

### When to Update Context

| Event | Action Required | Location |
|-------|----------------|----------|
| **New lesson added** | None (auto-loaded from DB) | Database query refresh |
| **Lesson description updated** | Clear cache: `aiContext.clearCache()` | Database + cache |
| **New admin feature** | Update hard-coded docs | `ai-context.js` line 154+ |
| **New API endpoint** | Add to admin context | `ai-context.js` admin context |
| **New grading rubric** | Update `getWeekSpecificRubric()` | `ai-context.js` line 200+ |
| **New documentation file** | Currently not auto-loaded | Future enhancement |

### Cache Management

**Automatic Cache**
- Curriculum context: Refreshes after 1 hour
- Docs context: Refreshes after 1 hour
- Triggered by: First AI question after expiry

**Manual Cache Clear**
```javascript
const aiContext = require('./services/ai-context');
aiContext.clearCache();
```

**When to manually clear:**
- After bulk lesson updates
- After changing curriculum structure
- During development/testing

### Adding New Knowledge

#### Option 1: Database-Driven (Recommended)
Update lessons/assignments via admin API:
```bash
# Update lesson description
PUT /api/lessons/5
{
  "description": "Enhanced description with more details about resume fundamentals..."
}
```
✅ **Advantage**: Automatically available to AI after cache refresh  
✅ **Advantage**: No code changes needed

#### Option 2: Hard-Coded Context
Edit `backend/services/ai-context.js`:
```javascript
// Add new admin feature documentation
context += `
== New Feature Name ==
- Description of feature
- How to access: Admin Dashboard → New Section
- API endpoint: POST /api/new-feature
- Example: { field: 'value' }
`;
```
✅ **Advantage**: More control over formatting  
❌ **Disadvantage**: Requires code deployment

#### Option 3: Dynamic Documentation (Future Enhancement)
Create a system to parse markdown files:
```javascript
async getDocsContext(topic) {
  const filePath = path.join(__dirname, '../../docs/', `${topic}-guide.md`);
  const content = await fs.readFile(filePath, 'utf-8');
  return this.parseMarkdownToContext(content);
}
```

## Enhancing AI Responses

### 1. Improve Lesson Descriptions

**Current state**: Some lessons have brief descriptions  
**Enhancement**: Add detailed descriptions in database

```sql
UPDATE lessons SET description = '
Welcome to Week 1! This foundational week helps you:
- Discover your MBTI personality type and what it means for career fit
- Define clear, measurable career goals using SMART framework
- Understand your strengths and how to leverage them
- Begin your professional development journey with self-awareness

Key Activities:
- Complete MBTI assessment (16personalities.com)
- Write career vision statement
- Identify 3 career paths aligned with your personality
- Set 3-month, 6-month, and 1-year professional goals

Expected Outcomes:
- Clear understanding of personality type
- Written career goals
- Action plan for professional development
' WHERE week = 1;
```

### 2. Add Assignment Rubrics

Currently hard-coded. To enhance:

```javascript
// In ai-context.js, expand getWeekSpecificRubric()
const rubrics = {
  5: `Resume Basics Rubric:
    - Contact Information (20%): Full name, phone, email, LinkedIn, location
    - Work Experience (30%): At least 2 positions, dates, bullet points
    - Education (20%): Degree, institution, graduation date
    - Skills (20%): 6-10 relevant skills, categorized
    - Formatting (10%): Consistent fonts, clear sections, 1-page
    
    Excellent (A): All sections complete with quantified achievements
    Good (B): All sections present, some achievements quantified
    Acceptable (C): All sections present, basic descriptions
    Needs Improvement (D): Missing sections or poor formatting`,
  // ... add more detailed rubrics
};
```

### 3. Context Token Management

**Challenge**: Hugging Face has token limits (context + response < model max tokens)

**Current limits:**
- Mistral-7B-Instruct: ~4096 tokens total
- Curriculum context: ~500 tokens
- Lesson context: ~200 tokens
- Admin context: ~600 tokens
- Student question: ~50 tokens
- Response: 250 tokens
- **Total**: ~1600 tokens (within limit ✓)

**If exceeding limits:**
1. Truncate descriptions: `description.substring(0, 200)`
2. Summarize curriculum: Show only current week + adjacent weeks
3. Use more concise rubrics
4. Load context on-demand only when keywords match

### 4. Topic-Specific Context Loading

**Enhancement**: Only load relevant context

Current approach (loads everything):
```javascript
const lessonContext = await getLessonContext(week);        // ~200 tokens
const curriculumContext = await getCurriculumContext();    // ~500 tokens
const adminContext = await getAdminContext(topic);         // ~600 tokens
```

Enhanced approach (selective loading):
```javascript
// Detect if question is about other weeks
if (question.includes('week') && detectOtherWeekNumber(question)) {
  // Load only that specific week
  const targetWeek = detectWeekNumber(question);
  const targetLessonContext = await getLessonContext(targetWeek);
  return targetLessonContext; // ~100 tokens
}

// Detect if question is about general career advice
if (isCareerAdviceQuestion(question)) {
  return curriculumThemesOnly(); // ~200 tokens, no full descriptions
}
```

## Testing AI Context

### Manual Testing

```bash
# Test student question
POST http://localhost:4000/api/ai/lesson-help
{
  "lesson_id": 1,
  "question": "What is MBTI and how does it help with career planning?"
}

# Test admin question
POST http://localhost:4000/api/ai/admin-help
{
  "question": "How do I create a new user account?"
}
```

### Verify Context Loading

Add temporary logging in `ai-helper.js`:
```javascript
async answerLessonQuestion(lesson, studentQuestion) {
  const lessonContext = await aiContext.getLessonContext(lesson.week);
  const curriculumContext = await aiContext.getCurriculumContext();
  
  // Temporary debug logging
  console.log('=== AI Context Debug ===');
  console.log('Lesson Context:', lessonContext);
  console.log('Curriculum Context (first 200 chars):', curriculumContext.substring(0, 200));
  console.log('========================');
  
  // ... rest of method
}
```

Check server logs for context data when AI is invoked.

### Context Quality Checklist

✅ **Lesson context includes:**
- Week number and title
- Full lesson description (not truncated)
- Related assignments (titles + instructions preview)
- Video URL (if available)

✅ **Curriculum context includes:**
- All 12 weeks overview
- Core themes summary
- Key skills developed

✅ **Admin context includes:**
- Relevant API endpoints
- UI navigation paths
- Example request bodies
- Best practices/warnings

## API Rate Limits

**Hugging Face Free Tier:**
- 30,000 requests/month
- ~1,000 requests/day
- Shared across all API keys

**Platform rate limits:**
- 10 AI questions per user per hour
- Tracked in `ai_usage` table
- Resets hourly via timestamp check

**Monitor usage:**
```sql
-- Total AI questions today
SELECT COUNT(*) FROM ai_usage 
WHERE DATE(created_at) = DATE('now');

-- By user
SELECT user_id, COUNT(*) as questions, MAX(created_at) as last_asked
FROM ai_usage 
WHERE created_at > datetime('now', '-1 hour')
GROUP BY user_id
ORDER BY questions DESC;

-- By type
SELECT type, COUNT(*) as count
FROM ai_usage
GROUP BY type;
```

## Troubleshooting

### Issue: AI gives generic responses

**Cause**: Context not loading properly  
**Fix**: 
1. Check database has lesson descriptions: `SELECT description FROM lessons WHERE week = 1;`
2. Verify cache is fresh: `aiContext.clearCache();`
3. Add debug logging to see what context is passed to Hugging Face

### Issue: AI responses cut off mid-sentence

**Cause**: Max tokens too low  
**Fix**: Increase `maxTokens` parameter
```javascript
return await this.generate(prompt, 350); // Increased from 250
```

### Issue: AI says "unavailable" immediately

**Cause**: HUGGINGFACE_API_KEY not set or invalid  
**Fix**:
```bash
# Check environment variable
echo $env:HUGGINGFACE_API_KEY  # PowerShell
echo $HUGGINGFACE_API_KEY      # Bash

# Test API key
node backend/test-huggingface-key.js
```

### Issue: 404 errors from Hugging Face

**Cause**: Model URL changed or API key exhausted  
**Fix**:
1. Check Hugging Face dashboard for quota: https://huggingface.co/settings/tokens
2. Update model URL in `ai-helper.js` if deprecated
3. Use fallback model (automatic)

### Issue: Admin context doesn't reflect new features

**Cause**: Hard-coded context outdated  
**Fix**: Update `ai-context.js` line 154+ with new feature documentation

## Best Practices

### 1. Keep Lesson Descriptions Comprehensive
- Aim for 300-500 words per lesson
- Include key learning objectives
- List expected outcomes
- Reference practical activities

### 2. Update Rubrics Regularly
- Review rubrics each semester
- Adjust based on common student questions
- Add examples of excellent work

### 3. Document New Features Immediately
- When adding admin features, update admin context
- Include API examples
- Add UI navigation paths

### 4. Monitor AI Usage Patterns
- Weekly: Check `ai_usage` table for common questions
- Monthly: Identify knowledge gaps
- Quarterly: Update context based on patterns

### 5. Test After Major Updates
- After curriculum changes: Test student AI with sample questions
- After admin features: Test admin AI with feature-specific questions
- After context updates: Clear cache and verify responses

## Future Enhancements

### Phase 1: Dynamic Documentation Loading
- Parse markdown files from `docs/` folder
- Extract relevant sections based on question topic
- Cache parsed content

### Phase 2: Student Progress Context
- Include user's completion status in context
- Reference their previous assignments
- Personalize encouragement based on performance

### Phase 3: Conversational Memory
- Store recent questions from same user
- Maintain conversation thread
- Reference previous answers

### Phase 4: Embeddings-Based Search
- Create vector embeddings of all lessons
- Semantic search for most relevant content
- More intelligent context selection

### Phase 5: Custom Fine-Tuned Model
- Collect anonymized Q&A pairs
- Fine-tune model on platform-specific content
- Deploy custom model for better accuracy

## Contact & Support

For issues with AI functionality:
1. Check this guide first
2. Review server logs for errors
3. Test Hugging Face API key
4. Verify database has complete lesson data
5. Contact platform administrator

---
**Document Version**: 1.0  
**Last Updated**: February 18, 2026  
**Maintainer**: Platform Administrator
