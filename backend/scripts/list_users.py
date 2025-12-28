import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.models.user import User

def list_users():
    db = SessionLocal()
    try:
        users = db.query(User).all()
        print(f"Total users: {len(users)}")
        for u in users:
            print(f"- ID: {u.id}, Username: '{u.username}', Role: {u.role}")
    finally:
        db.close()

if __name__ == "__main__":
    list_users()
