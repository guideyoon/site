import sys
import os
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from sqlalchemy import create_engine, text

# Check both SQLite and Postgres just in case
SQLITE_URL = "sqlite:///backend/navercafe.db"
POSTGRES_URL = "postgresql://navercafe:navercafe123@localhost:5432/navercafe"

def check_users(db_url, name):
    print(f"\n--- Checking {name} ({db_url}) ---")
    try:
        engine = create_engine(db_url)
        with engine.connect() as conn:
            result = conn.execute(text("SELECT id, username, role FROM users"))
            users = result.fetchall()
            if not users:
                print("No users found.")
            for u in users:
                print(f"ID: {u.id}, Username: {u.username}, Role: {u.role}")
    except Exception as e:
        print(f"Could not connect or query: {e}")

if __name__ == "__main__":
    check_users(SQLITE_URL, "SQLite")
    check_users(POSTGRES_URL, "Postgres")
