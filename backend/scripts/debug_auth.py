import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.models.user import User
from app.auth import verify_password

def check_admin(password="admin123"):
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.username == "admin").first()
        if not user:
            print("❌ User 'admin' NOT FOUND in database!")
            return False
            
        print(f"✅ User 'admin' found.")
        print(f"   Role: {user.role}")
        print(f"   Hashed Password: {user.hashed_password[:10]}...")
        
        is_valid = verify_password(password, user.hashed_password)
        if is_valid:
            print(f"✅ Password verification SUCCESS for '{password}'")
        else:
            print(f"❌ Password verification FAILED for '{password}'")
            
        return is_valid
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    check_admin()
