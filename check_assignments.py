import sqlite3

conn = sqlite3.connect('backend/data/project.db')
cursor = conn.cursor()

cursor.execute("SELECT id, title FROM assignments LIMIT 5;")
assignments = cursor.fetchall()

print("Available assignments:")
for assignment in assignments:
    print(f"ID: {assignment[0]}, Title: {assignment[1]}")

conn.close()