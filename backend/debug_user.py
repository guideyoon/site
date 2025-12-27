from app.database import SessionLocal
from app.models.user import User
from datetime import datetime, timezone

def check_user_debug(username):
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.username == username).first()
        if not user:
            print(f"User {username} not found")
            return
        
        print(f"User: {user.username}")
        print(f"Role: {user.role}")
        print(f"Expires At: {user.expires_at}")
        
        now = datetime.now(timezone.utc)
        print(f"Current Time (UTC): {now}")
        
        if user.expires_at:
            # Ensure user.expires_at is timezone-aware for comparison
            expires_at = user.expires_at
            if expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=timezone.utc)
            
            print(f"Expires At (Aware): {expires_at}")
            is_expired = now > expires_at
            print(f"Is Expired: {is_expired}")
        else:
            print("No expiration set")
            
    finally:
        db.close()

if __name__ == "__main__":
    import sys
    username = sys.argv[1] if len(sys.argv) > 1 else 'facecap'
    check_user_debug(username)
