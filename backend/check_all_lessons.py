import sqlite3

conn = sqlite3.connect('data/project.db')
cursor = conn.cursor()

# Check lessons table structure
print("LESSONS table schema:")
cursor.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='lessons';")
result = cursor.fetchone()
if result:
    print(result[0])
else:
    print("  Lessons table doesn't exist!")

print("\n" + "="*80 + "\n")

# Check all lessons (using only columns that exist)
print("All lessons in database:")
cursor.execute("SELECT id, title, description, video_url FROM lessons ORDER BY id;")
lessons = cursor.fetchall()

if lessons:
    for lesson in lessons:
        print(f"ID: {lesson[0]}")
        print(f"  Title: {lesson[1]}")
        print(f"  Video URL: {lesson[3]}")
        print(f"  Description: {lesson[2][:80] if lesson[2] else 'No description'}...")
        print()
else:
    print("No lessons found in database")

print("="*80)
print(f"Total lessons: {len(lessons)}")

conn.close()