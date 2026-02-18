import sqlite3
from datetime import datetime, timedelta
import os

# Get the correct path to database
script_dir = os.path.dirname(os.path.abspath(__file__))
db_path = os.path.join(script_dir, 'data', 'project.db')

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Step 1: Create Week 1 Lesson
print("Step 1: Creating Week 1 Lesson...")
lesson_data = {
    "title": "Week 1: Introduction & Self-Assessment",
    "description": "Welcome to Week 1! This week focuses on understanding yourself through MBTI personality assessment and defining your career goals.",
    "video_url": "https://youtu.be/example"  # Replace with actual video URL
}

cursor.execute("""
    INSERT INTO lessons (title, description, video_url)
    VALUES (?, ?, ?)
""", (lesson_data["title"], lesson_data["description"], lesson_data["video_url"]))

conn.commit()
lesson_id = cursor.lastrowid
print(f"✓ Lesson created with ID: {lesson_id}")
print(f"  Title: {lesson_data['title']}\n")

# Step 2: Create Week 1 Assignment
print("Step 2: Creating Week 1 Assignment...")
assignment_data = {
    "lesson_id": lesson_id,
    "title": "MBTI & Career Goals Submission",
    "instructions": """Please complete the following in the text box:

1. **MBTI Personality Type**: Share your 4-letter MBTI type (e.g., INTJ, ESFP, etc.)
   - If you haven't taken the test, take a free one at 16personalities.com

2. **Career Interest Declaration**: Write 2-3 sentences about your career interests and goals.

Example:
"My MBTI type is ENFP. I am interested in pursuing a career in software development with a focus on user experience design. I want to create applications that make people's lives easier."
""",
    "due_date": (datetime.now() + timedelta(days=7)).strftime('%Y-%m-%d %H:%M:%S'),
    "org_id": 1
}

cursor.execute("""
    INSERT INTO assignments (lesson_id, title, instructions, due_date, org_id)
    VALUES (?, ?, ?, ?, ?)
""", (
    assignment_data["lesson_id"],
    assignment_data["title"],
    assignment_data["instructions"],
    assignment_data["due_date"],
    assignment_data["org_id"]
))

conn.commit()
assignment_id = cursor.lastrowid

print(f"✓ Assignment created with ID: {assignment_id}")
print(f"  Title: {assignment_data['title']}")
print(f"  Due Date: {assignment_data['due_date']}")
print(f"\n{'='*60}")
print("Week 1 lesson and assignment created successfully!")
print(f"Lesson ID: {lesson_id}")
print(f"Assignment ID: {assignment_id}")

conn.close()