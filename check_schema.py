import sqlite3

conn = sqlite3.connect('backend/data/project.db')
cursor = conn.cursor()

# Check lessons table constraints
print("LESSONS table schema:")
cursor.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='lessons';")
result = cursor.fetchone()
if result:
    print(result[0])
else:
    print("  No CREATE statement found")

print("\n" + "="*80 + "\n")

# Check assignments table constraints  
print("ASSIGNMENTS table schema:")
cursor.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='assignments';")
result = cursor.fetchone()
if result:
    print(result[0])
else:
    print("  No CREATE statement found")

print("\n" + "="*80 + "\n")

# Check what's in organizations
print("ORGANIZATIONS table data:")
cursor.execute("SELECT * FROM organizations;")
orgs = cursor.fetchall()
for org in orgs:
    print(org)

conn.close()