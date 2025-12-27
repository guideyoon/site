import sqlite3
import os

db_path = "navercafe.db"
if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    print("--- Sources Schema ---")
    cursor.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='sources';")
    print(cursor.fetchone()[0])
    
    print("\n--- Sources Table Info ---")
    cursor.execute("PRAGMA table_info(sources);")
    for row in cursor.fetchall():
        print(row)
        
    conn.close()
else:
    print(f"Database not found at {db_path}")
