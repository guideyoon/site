import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.models.user import User

def check_user():
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.username == "facecap").first()
        if user:
            print(f"User: {user.username}")
            print(f"Expires at: {user.expires_at}")
        else:
            print("User facecap not found")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    check_user()
