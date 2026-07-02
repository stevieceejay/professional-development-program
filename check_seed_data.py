import sqlite3

# Connect to the database
conn = sqlite3.connect('project1.db')
cursor = conn.cursor()

# Get all table names
cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
tables = cursor.fetchall()
print("Tables in database:", tables)

# If there's a users table, show its contents
try:
    cursor.execute("SELECT * FROM users;")
    users = cursor.fetchall()
    print("\nUsers table:")
    for user in users:
        print(user)
except:
    print("No users table found")

conn.close()
