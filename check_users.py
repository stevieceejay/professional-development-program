import sqlite3

conn = sqlite3.connect('backend/data/project.db')
cursor = conn.cursor()

cursor.execute("SELECT id, username, email, role, first_name, last_name FROM users;")
users = cursor.fetchall()

print("Current users in database:\n")
print(f"{'ID':<5} {'Username':<15} {'Email':<25} {'Role':<10} {'Name':<20}")
print("-" * 80)
for user in users:
    user_id, username, email, role, first_name, last_name = user
    full_name = f"{first_name or ''} {last_name or ''}".strip() or "N/A"
    print(f"{user_id:<5} {username:<15} {email:<25} {role:<10} {full_name:<20}")

# Check if there are any lessons/assignments for "week 1"
cursor.execute("SELECT id, title, description FROM lessons WHERE title LIKE '%week%' OR title LIKE '%1%';")
lessons = cursor.fetchall()

print("\n\nLessons/Weeks available:")
if lessons:
    for lesson in lessons:
        print(f"  - Lesson {lesson[0]}: {lesson[1]}")
else:
    print("  ❌ No lessons found - this is likely why submissions fail!")

cursor.execute("SELECT id, title FROM assignments WHERE title LIKE '%week%' OR title LIKE '%1%';")
assignments = cursor.fetchall()

print("\nAssignments available:")
if assignments:
    for assignment in assignments:
        print(f"  - Assignment {assignment[0]}: {assignment[1]}")
else:
    print("  ❌ No assignments found!")

conn.close()