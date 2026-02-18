import sqlite3
import bcrypt
import os

# Connect to database
conn = sqlite3.connect('data/project.db')
cursor = conn.cursor()

# Check Bob's current password hash
cursor.execute("SELECT id, username, password FROM users WHERE username='bob';")
bob = cursor.fetchone()

if bob:
    print(f"Bob found: ID={bob[0]}, Username={bob[1]}")
    print(f"Current password hash: {bob[2][:50]}...")
    
    # Reset password - read from env var to avoid hardcoding
    new_password = os.environ.get('RESET_BOB_PASSWORD')
    if not new_password:
        print('✗ RESET_BOB_PASSWORD environment variable not set. Aborting to avoid insecure default.')
        exit(2)
    hashed = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    cursor.execute("UPDATE users SET password=? WHERE username='bob'", [hashed])
    conn.commit()
    
    print(f"\n✓ Password reset to: {new_password}")
    print(f"New hash: {hashed[:50]}...")
else:
    print("✗ Bob not found!")

conn.close()