from app.database import SessionLocal
from sqlalchemy import text
from datetime import datetime, timezone, timedelta

def set_expired(username):
    db = SessionLocal()
    try:
        # Set to 1 day ago
        past_date = (datetime.now(timezone.utc) - timedelta(days=1)).strftime('%Y-%m-%d %H:%M:%S')
        db.execute(text(f"UPDATE users SET expires_at = '{past_date}' WHERE username = :u"), {"u": username})
        db.commit()
        print(f"Set {username} to expired ({past_date})")
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    set_expired('facecap')
