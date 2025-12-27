import sys
import os
import sqlite3

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.database import SessionLocal
from app.models.user import User
from app.auth import verify_password

def debug_login():
    db = SessionLocal()
    
    username = "admin"
    password = "admin123"
    
    print(f"로그인 시도: {username} / {password}")
    
    user = db.query(User).filter(User.username == username).first()
    
    if not user:
        print("✗ 사용자를 찾을 수 없습니다!")
    else:
        print(f"✓ 사용자 찾음: {user.username}")
        print(f"  저장된 해시: {user.hashed_password}")
        
        is_valid = verify_password(password, user.hashed_password)
        print(f"  비밀번호 검증: {'✓ 성공' if is_valid else '✗ 실패'}")
    
    db.close()

if __name__ == "__main__":
    debug_login()
