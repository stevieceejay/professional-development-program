import sqlite3

conn = sqlite3.connect('backend/data/project.db')
cursor = conn.cursor()

# Check if Bob exists
print("Checking for Bob in users table:")
cursor.execute("SELECT id, username, email, role FROM users WHERE username LIKE '%bob%' OR email LIKE '%bob%';")
bob = cursor.fetchall()

if bob:
    for user in bob:
        print(f"ID: {user[0]}, Username: {user[1]}, Email: {user[2]}, Role: {user[3]}")
else:
    print("Bob not found. Checking all users:")
    cursor.execute("SELECT id, username, email, role FROM users LIMIT 10;")
    users = cursor.fetchall()
    for user in users:
        print(f"ID: {user[0]}, Username: {user[1]}, Email: {user[2]}, Role: {user[3]}")

conn.close()