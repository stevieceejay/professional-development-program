import sqlite3
from datetime import datetime, timedelta

conn = sqlite3.connect('data/project.db')
cursor = conn.cursor()

# Create Week 1 assignment
assignment_data = {
    "title": "Week 1: Personal Assessment - MBTI & Career Goals",
    "description": """Welcome to Week 1! This assignment helps us understand you better.

Please complete the following in the text box below:

1. **MBTI Personality Type**: Share your 4-letter MBTI type (e.g., INTJ, ESFP, etc.)
   - If you haven't taken the test, you can take a free one at 16personalities.com

2. **Career Interest Declaration**: Write a brief statement (2-3 sentences) about your career interests and goals.

Example submission:
"My MBTI type is ENFP. I am interested in pursuing a career in software development with a focus on user experience design. I want to create applications that make people's lives easier and more enjoyable."
""",
    "lesson_id": 1,
    "organization_id": 1,
    "max_score": 10,
    "due_date": (datetime.now() + timedelta(days=7)).strftime('%Y-%m-%d %H:%M:%S'),
    "created_at": datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
    "updated_at": datetime.now().strftime('%Y-%m-%d %H:%M:%S')
}

# Check if lesson 1 exists
cursor.execute("SELECT id, title FROM lessons WHERE id=1;")
lesson = cursor.fetchone()

if lesson:
    print(f"Found lesson: ID={lesson[0]}, Title={lesson[1]}")
    
    # Insert the assignment
    cursor.execute("""
        INSERT INTO assignments (
            title, description, lesson_id, organization_id, 
            max_score, due_date, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        assignment_data["title"],
        assignment_data["description"],
        assignment_data["lesson_id"],
        assignment_data["organization_id"],
        assignment_data["max_score"],
        assignment_data["due_date"],
        assignment_data["created_at"],
        assignment_data["updated_at"]
    ))
    
    conn.commit()
    assignment_id = cursor.lastrowid
    
    print(f"\n✓ Week 1 assignment created successfully!")
    print(f"Assignment ID: {assignment_id}")
    print(f"Title: {assignment_data['title']}")
    print(f"Due Date: {assignment_data['due_date']}")
    
else:
    print("✗ Error: Lesson 1 not found. Please check your lessons table.")
    print("\nAvailable lessons:")
    cursor.execute("SELECT id, title FROM lessons LIMIT 5;")
    lessons = cursor.fetchall()
    for l in lessons:
        print(f"  ID: {l[0]}, Title: {l[1]}")

conn.close()