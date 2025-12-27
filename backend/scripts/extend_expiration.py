import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.models.user import User
from datetime import datetime, timedelta, timezone

def extend_users():
    db = SessionLocal()
    try:
        users = db.query(User).all()
        for user in users:
            print(f"Checking user: {user.username}, Expires at: {user.expires_at}")
            
            # Extend to one year from now
            new_expire = datetime.now(timezone.utc) + timedelta(days=365)
            user.expires_at = new_expire
            print(f" -> Extended to: {new_expire}")
            
        db.commit()
        print("All users extended successfully.")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    extend_users()
