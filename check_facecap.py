import os
import sys
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from datetime import datetime, timezone

# Manually load settings to avoid pydantic issues if environment isn't set right
DB_URL = "postgresql://navercafe:navercafe123@localhost:5432/navercafe"

def check_user(username):
    print(f"Connecting to {DB_URL}...")
    engine = create_engine(DB_URL)
    Session = sessionmaker(bind=engine)
    session = Session()
    try:
        from sqlalchemy import text
        result = session.execute(text("SELECT username, role, expires_at FROM users WHERE username = :u"), {"u": username}).fetchone()
        
        if not result:
            print(f"User {username} not found")
            return
        
        uname, role, expires_at = result
        print(f"USER: {uname}")
        print(f"ROLE: {role}")
        print(f"EXPIRES_AT: {expires_at}")
        
        now = datetime.now(timezone.utc)
        print(f"CURRENT_TIME_UTC: {now}")
        
        if expires_at:
            # Check if aware
            if expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=timezone.utc)
                print("Note: expires_at was naive, treated as UTC")
            
            if now > expires_at:
                print("STATUS: EXPIRED (Should be blocked)")
            else:
                print("STATUS: ACTIVE")
        else:
            print("STATUS: NO EXPIRATION SET")
            
    except Exception as e:
        print(f"Error: {e}")
    finally:
        session.close()

if __name__ == "__main__":
    check_user('facecap')
