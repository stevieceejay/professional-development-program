import sqlite3
from datetime import datetime, timedelta
import os

# Connect to database
db_path = os.path.join(os.path.dirname(__file__), 'data', 'project.db')
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Check current lessons table structure
cursor.execute("PRAGMA table_info(lessons)")
columns = cursor.fetchall()

print("Current lessons table columns:")
for col in columns:
    print(f"  - {col[1]} ({col[2]})")

# Check if week column exists
has_week = any(col[1] == 'week' for col in columns)

if not has_week:
    print("\n❌ Missing 'week' column!")
    print("Adding 'week' column to lessons table...")
    cursor.execute("ALTER TABLE lessons ADD COLUMN week INTEGER")
    conn.commit()
    print("✓ Week column added!")
else:
    print("\n✓ Week column exists")

# Calculate due dates (1 week apart, starting next Monday)
start_date = datetime.now()
days_until_monday = (7 - start_date.weekday()) % 7
if days_until_monday == 0:
    days_until_monday = 7
first_due = start_date + timedelta(days=days_until_monday)

# Complete 12-week curriculum
lessons_data = [
    {
        "week": 1,
        "title": "Week 1: Introduction & Self-Assessment",
        "description": "Welcome to Week 1! Explore your MBTI personality type and define your career goals. This foundational week helps you understand your strengths and aspirations as you begin your professional development journey.",
        "video_url": "videos/week1-intro.mp4",
        "assignment_title": "MBTI & Career Goals Submission",
        "assignment_instructions": "Submit your MBTI personality type and write 2-3 sentences describing your career interests and professional goals. This helps us understand your starting point and tailor guidance throughout the program."
    },
    {
        "week": 2,
        "title": "Week 2: Digital Education I - Gmail & Drive",
        "description": "Master professional email communication and cloud storage fundamentals. Learn Gmail etiquette, organizational systems, and Google Drive file management essential for modern workplaces.",
        "video_url": "videos/week2-gmail-drive.mp4",
        "assignment_title": "Professional Email & Cloud Storage Setup",
        "assignment_instructions": "Create a professional email signature in Gmail and organize a sample Google Drive folder structure for professional documents. Submit: (1) Screenshot of your email signature, (2) Brief description of your Drive folder organization strategy."
    },
    {
        "week": 3,
        "title": "Week 3: Digital Education II - Docs, Sheets, Slides",
        "description": "Master Google Workspace core applications for professional documentation, data analysis, and presentations. Build essential skills for creating compelling business documents.",
        "video_url": "videos/week3-google-workspace.mp4",
        "assignment_title": "Google Workspace Portfolio",
        "assignment_instructions": "Create three professional documents: (1) Resume draft in Google Docs, (2) Personal budget tracker in Google Sheets, (3) Elevator pitch presentation in Google Slides (minimum 5 slides). Submit shareable links to all three documents."
    },
    {
        "week": 4,
        "title": "Week 4: Digital Education III - Notion, Zoom, Slack",
        "description": "Understand modern collaboration tools essential for remote work and team communication. Use AI to explore platform features and establish your professional presence on each platform.",
        "video_url": "videos/week4-collaboration-tools.mp4",
        "assignment_title": "Professional Platform Setup",
        "assignment_instructions": "Create accounts on Notion, Zoom, and Slack. Use AI assistance to explore key features of each platform. Submit screenshots or text showing your username/email for all three platforms, plus a brief note on one feature you discovered on each platform."
    },
    {
        "week": 5,
        "title": "Week 5: Resume Fundamentals",
        "description": "Understand resume structure and essential elements using AI assistance. Learn how to present your work history, education, and skills effectively for your target roles.",
        "video_url": "videos/week5-resume-basics.mp4",
        "assignment_title": "Initial Resume Draft",
        "assignment_instructions": "Create your initial resume draft with AI assistance covering work history, education, and skills. Submit resume as PDF or Google Doc link showing proper structure and complete sections."
    },
    {
        "week": 6,
        "title": "Week 6: Resume Refinement",
        "description": "Deep dive with AI to refine and polish your resume to professional standards. Transform your draft into a compelling document that showcases your achievements and potential. **FIRST MAJOR COURSE MILESTONE**",
        "video_url": "videos/week6-resume-refinement.mp4",
        "assignment_title": "Refined Resume - Major Milestone",
        "assignment_instructions": "Submit your polished, refined resume incorporating AI feedback, professional formatting, and achievement-focused language. This is your **first major course milestone**. Submit as PDF or Google Doc link."
    },
    {
        "week": 7,
        "title": "Week 7: Cover Letter Fundamentals",
        "description": "Explore how AI can transform your resume into a compelling cover letter. Learn the art of storytelling and persuasive writing for job applications.",
        "video_url": "videos/week7-cover-letter-basics.mp4",
        "assignment_title": "Initial Cover Letter Draft",
        "assignment_instructions": "Draft your initial cover letter using AI assistance based on your refined resume. Tailor it to a specific job or industry of interest. Submit as PDF or Google Doc link."
    },
    {
        "week": 8,
        "title": "Week 8: Cover Letter Refinement - Real-World Application",
        "description": "Take your cover letter to the next level by actively seeking a real job opportunity and creating a tailored cover letter that meets specific real-world expectations.",
        "video_url": "videos/week8-cover-letter-real-world.mp4",
        "assignment_title": "Tailored Cover Letter for Real Opportunity",
        "assignment_instructions": "Research and select a real job posting that interests you. Use AI to craft a refined cover letter customized for that specific role. Submit: (1) Job posting link or description, (2) Tailored cover letter (PDF or Google Doc)."
    },
    {
        "week": 9,
        "title": "Week 9: Job Search Strategy - 30-60-90 Day Plan",
        "description": "Use AI to assess real-world opportunities and craft a strategic job readiness plan. Create a detailed action plan to structure your job search and skill development over the next three months.",
        "video_url": "videos/week9-job-search-strategy.mp4",
        "assignment_title": "30-60-90 Day Job Search Action Plan",
        "assignment_instructions": "Work with AI to analyze your resume, cover letter, and target roles, then create a detailed 30-60-90 day action plan. Include: (1) Target companies/roles, (2) Daily/weekly job search activities, (3) Skill development goals, (4) Networking strategy, (5) Application tracking system. Submit as PDF or Google Doc."
    },
    {
        "week": 10,
        "title": "Week 10: Networking & Communication Skills",
        "description": "Seek professional opportunities by reaching out to experts in your desired fields. Practice professional outreach to expose yourself to knowledge, mentorship, and employment opportunities.",
        "video_url": "videos/week10-networking.mp4",
        "assignment_title": "Professional Outreach Campaign",
        "assignment_instructions": "Identify and contact 3-5 professionals in your target field via LinkedIn, email, or informational interview requests. Submit: (1) Evidence of outreach (screenshots of messages sent, email drafts, or responses received), (2) Brief reflection (1-2 paragraphs) on what you learned from each interaction."
    },
    {
        "week": 11,
        "title": "Week 11: Video Reflection Assignment",
        "description": "Reflect on your professional development journey through the program. Document your growth, key learnings, challenges overcome, and articulate your next steps with clarity and confidence.",
        "video_url": "videos/week11-reflection.mp4",
        "assignment_title": "Video Reflection on Professional Growth",
        "assignment_instructions": "Create a 3-5 minute video reflection discussing your journey through the program. Cover: (1) What you learned, (2) How you've grown professionally, (3) Your biggest breakthrough moment, (4) Your career goals moving forward. Submit video link (YouTube/Vimeo) or upload file."
    },
    {
        "week": 12,
        "title": "Week 12: Final Portfolio & Program Completion",
        "description": "Compile and submit your complete professional portfolio with all refined documents. This final week represents the culmination of your 12-week journey and demonstrates your readiness for professional opportunities. **FINAL COURSE MILESTONE**",
        "video_url": "videos/week12-completion.mp4",
        "assignment_title": "Final Portfolio Submission - Program Completion",
        "assignment_instructions": "Submit final revised versions of ALL THREE core documents as your **final course milestone**: (1) Final polished resume (PDF), (2) Final polished cover letter (PDF), (3) Final 30-60-90 day job search plan (PDF or Doc). Also confirm that all previous 11 weeks' assignments have been submitted. This completes your professional development program."
    }
]

print("="*60)
print("POPULATING 12-WEEK CURRICULUM")
print("="*60)

# Clear existing lessons and assignments
cursor.execute("DELETE FROM assignments")
cursor.execute("DELETE FROM lessons")
cursor.execute("DELETE FROM submissions")
conn.commit()
print("✓ Cleared existing lessons, assignments, and submissions")

# Insert all 12 weeks
for i, lesson in enumerate(lessons_data):
    due_date = (first_due + timedelta(weeks=i)).strftime('%Y-%m-%d %H:%M:%S')
    
    # Insert lesson
    cursor.execute("""
        INSERT INTO lessons (week, title, description, video_url)
        VALUES (?, ?, ?, ?)
    """, (lesson['week'], lesson['title'], lesson['description'], lesson['video_url']))
    
    lesson_id = cursor.lastrowid
    
    # Insert assignment
    cursor.execute("""
        INSERT INTO assignments (lesson_id, title, instructions, due_date)
        VALUES (?, ?, ?, ?)
    """, (lesson_id, lesson['assignment_title'], lesson['assignment_instructions'], due_date))
    
    print(f"\n✓ Week {lesson['week']}: {lesson['title']}")
    print(f"  Assignment: {lesson['assignment_title']}")
    print(f"  Due: {due_date}")

conn.commit()
conn.close()

print("\n" + "="*60)
print("SUCCESS! All 12 weeks populated")
print("="*60)
print(f"\nDue dates start: {first_due.strftime('%Y-%m-%d')}")
print("Due dates are 1 week apart")
print("\nNext steps:")
print("1. Restart your server: npm start")
print("2. Visit http://localhost:8080")
print("3. Check lessons page to see all 12 weeks")
print("4. Run: python check_all_lessons.py")




