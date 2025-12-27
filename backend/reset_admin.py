import sys
import os
import hashlib
from sqlalchemy import create_engine, text

# Database URLs
SQLITE_URL = "sqlite:///backend/navercafe.db"
POSTGRES_URL = "postgresql://navercafe:navercafe123@localhost:5432/navercafe"

def get_password_hash(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def reset_password(db_url, name):
    print(f"\n--- Resetting Admin in {name} ---")
    password = "admin1234"
    hashed = get_password_hash(password)
    
    try:
        engine = create_engine(db_url)
        with engine.connect() as conn:
            # Check if admin exists
            result = conn.execute(text("SELECT id FROM users WHERE username = 'admin'"))
            user = result.fetchone()
            
            if user:
                conn.execute(
                    text("UPDATE users SET hashed_password = :h, role = 'admin' WHERE username = 'admin'"),
                    {"h": hashed}
                )
                print(f"Successfully updated 'admin' password to '{password}'")
            else:
                conn.execute(
                    text("INSERT INTO users (username, hashed_password, role) VALUES ('admin', :h, 'admin')"),
                    {"h": hashed}
                )
                print(f"Successfully created 'admin' user with password '{password}'")
            
            conn.commit()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    reset_password(SQLITE_URL, "SQLite")
    reset_password(POSTGRES_URL, "Postgres")
