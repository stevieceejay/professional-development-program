import sqlite3

conn = sqlite3.connect('data/project.db')
cursor = conn.cursor()

# Check assignments table structure
print("ASSIGNMENTS table schema:")
cursor.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='assignments';")
result = cursor.fetchone()
if result:
    print(result[0])
else:
    print("  Assignments table doesn't exist!")

conn.close()