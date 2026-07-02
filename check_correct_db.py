import sqlite3
import os

db_path = 'backend/data/project.db'

if not os.path.exists(db_path):
    print(f"❌ Database NOT found at: {db_path}")
    print("You need to create it first!")
else:
    print(f"✅ Database found at: {db_path}\n")
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Get all tables
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = cursor.fetchall()
    print("Tables:", [t[0] for t in tables])
    
    # Check each table structure
    for table in tables:
        table_name = table[0]
        cursor.execute(f"PRAGMA table_info({table_name});")
        columns = cursor.fetchall()
        print(f"\n{table_name} columns:")
        for col in columns:
            print(f"  - {col[1]} ({col[2]})")
        
        # Show row count
        cursor.execute(f"SELECT COUNT(*) FROM {table_name};")
        count = cursor.fetchone()[0]
        print(f"  Rows: {count}")
    
    conn.close()