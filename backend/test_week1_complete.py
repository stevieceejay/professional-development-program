import sqlite3
import requests
import json
import os

# Get correct database path
script_dir = os.path.dirname(os.path.abspath(__file__))
db_path = os.path.join(script_dir, 'data', 'project.db')

# Test 1: Check Database
print("="*60)
print("TEST 1: Checking Database")
print("="*60)
print(f"Database path: {db_path}\n")

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Check lesson exists
cursor.execute("SELECT id, title, description, video_url FROM lessons WHERE id=1;")
lesson = cursor.fetchone()
if lesson:
    print(f"✓ Lesson found:")
    print(f"  ID: {lesson[0]}")
    print(f"  Title: {lesson[1]}")
    print(f"  Description: {lesson[2][:50]}...")
else:
    print("✗ No lesson found with ID 1")
    print("\nAll lessons:")
    cursor.execute("SELECT id, title FROM lessons;")
    all_lessons = cursor.fetchall()
    for l in all_lessons:
        print(f"  ID: {l[0]}, Title: {l[1]}")

# Check assignment exists
cursor.execute("SELECT id, lesson_id, title, instructions, due_date FROM assignments WHERE lesson_id=1;")
assignment = cursor.fetchone()
if assignment:
    print(f"\n✓ Assignment found:")
    print(f"  ID: {assignment[0]}")
    print(f"  Lesson ID: {assignment[1]}")
    print(f"  Title: {assignment[2]}")
    print(f"  Due Date: {assignment[4]}")
else:
    print("\n✗ No assignment found for lesson 1")
    print("\nAll assignments:")
    cursor.execute("SELECT id, lesson_id, title FROM assignments;")
    all_assignments = cursor.fetchall()
    for a in all_assignments:
        print(f"  ID: {a[0]}, Lesson ID: {a[1]}, Title: {a[2]}")

# Check for assignment submissions table
print("\n" + "-"*60)
print("Checking submissions/logs table:")
cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%submission%' OR name LIKE '%log%';")
tables = cursor.fetchall()
if tables:
    for table in tables:
        print(f"  Found table: {table[0]}")
        cursor.execute(f"SELECT sql FROM sqlite_master WHERE name='{table[0]}';")
        schema = cursor.fetchone()
        print(f"  Schema: {schema[0]}\n")
        
        # Check if there are any records
        cursor.execute(f"SELECT COUNT(*) FROM {table[0]};")
        count = cursor.fetchone()[0]
        print(f"  Records in {table[0]}: {count}")
else:
    print("  ✗ No submission/log tables found")
    print("\nAll tables in database:")
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    all_tables = cursor.fetchall()
    for t in all_tables:
        print(f"    - {t[0]}")

# Check Bob exists
cursor.execute("SELECT id, username, email, role FROM users WHERE username='bob';")
bob = cursor.fetchone()
if bob:
    print(f"\n✓ Test user Bob found:")
    print(f"  ID: {bob[0]}")
    print(f"  Username: {bob[1]}")
    print(f"  Email: {bob[2]}")
    print(f"  Role: {bob[3]}")
else:
    print("\n✗ Test user Bob not found")

conn.close()

print("\n" + "="*60)
print("TEST 2: Testing API Endpoints")
print("="*60)

BASE_URL = "http://localhost:5000"
API_URL = f"{BASE_URL}/api"

# Test server is running
try:
    response = requests.get(BASE_URL, timeout=2)
    print(f"✓ Server is running at {BASE_URL}")
except requests.exceptions.RequestException as e:
    print(f"✗ Server not responding at {BASE_URL}")
    print(f"  Error: {e}")
    print("\nPlease start your backend server:")
    print("  cd C:\\Users\\NewAdmin\\Documents\\ARG-professional-developement")
    print("  node server.js")
    exit(1)

# Test login
print("\nTesting login endpoint...")
token = None
try:
    login_response = requests.post(f"{API_URL}/auth/login", json={
        "username": "bob",
        "password": "password123"
    })
    
    if login_response.status_code == 200:
        token = login_response.json().get("token")
        print(f"✓ Login successful")
        print(f"  Token received: {token[:20]}...")
    else:
        print(f"✗ Login failed: {login_response.status_code}")
        print(f"  Response: {login_response.text}")
except Exception as e:
    print(f"✗ Login error: {e}")

# Test fetching lessons
if token:
    print("\nTesting lessons endpoint...")
    headers = {"Authorization": f"Bearer {token}"}
    
    try:
        lessons_response = requests.get(f"{API_URL}/lessons", headers=headers)
        if lessons_response.status_code == 200:
            lessons_data = lessons_response.json()
            print(f"✓ Lessons endpoint working")
            print(f"  Found {len(lessons_data)} lesson(s)")
            if lessons_data:
                print(f"  First lesson: {lessons_data[0].get('title')}")
        else:
            print(f"✗ Lessons endpoint failed: {lessons_response.status_code}")
    except Exception as e:
        print(f"✗ Error fetching lessons: {e}")

    # Test fetching assignments
    if lesson:
        print("\nTesting assignments endpoint...")
        try:
            assignments_response = requests.get(
                f"{API_URL}/lessons/{lesson[0]}/assignments", 
                headers=headers
            )
            if assignments_response.status_code == 200:
                assignments_data = assignments_response.json()
                print(f"✓ Assignments endpoint working")
                print(f"  Found {len(assignments_data)} assignment(s)")
                if assignments_data:
                    print(f"  First assignment: {assignments_data[0].get('title')}")
            else:
                print(f"✗ Assignments endpoint failed: {assignments_response.status_code}")
                print(f"  Response: {assignments_response.text}")
        except Exception as e:
            print(f"✗ Error fetching assignments: {e}")

print("\n" + "="*60)
print("TEST 3: Testing Assignment Submission")
print("="*60)

if token and assignment:
    submission_data = {
        "content": """My MBTI type is ISTJ - The Logistician.

I am interested in pursuing a career in backend software development and systems architecture. I enjoy building robust, efficient systems and solving complex technical problems."""
    }
    
    try:
        submit_response = requests.post(
            f"{API_URL}/assignments/{assignment[0]}/submit",
            headers=headers,
            json=submission_data
        )
        
        if submit_response.status_code in [200, 201]:
            print("✓ Assignment submission successful!")
            print(json.dumps(submit_response.json(), indent=2))
        else:
            print(f"✗ Assignment submission failed: {submit_response.status_code}")
            print(f"  Response: {submit_response.text}")
    except Exception as e:
        print(f"✗ Error submitting assignment: {e}")
else:
    print("Skipping submission test - missing token or assignment")

print("\n" + "="*60)
print("SUMMARY")
print("="*60)
print("✓ Run this test to verify everything works")
print("✓ Check database path and tables")
print("✓ Ensure server is running on http://localhost:5000")
print("Server running on port 5000")