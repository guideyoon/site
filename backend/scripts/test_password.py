import sys
import os
import sqlite3

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.auth import get_password_hash, verify_password

DB_PATH = os.path.join(os.path.dirname(__file__), '../navercafe.db')

def test_password():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute("SELECT username, hashed_password FROM users WHERE username = 'admin'")
    row = cursor.fetchone()
    
    if row:
        username, stored_hash = row
        print(f"사용자: {username}")
        print(f"저장된 해시: {stored_hash}")
        
        # 테스트 비밀번호들
        test_passwords = ["admin123", "admin", "password"]
        
        for pwd in test_passwords:
            test_hash = get_password_hash(pwd)
            is_match = verify_password(pwd, stored_hash)
            print(f"\n비밀번호 '{pwd}' 테스트:")
            print(f"  생성된 해시: {test_hash}")
            print(f"  검증 결과: {'✓ 일치' if is_match else '✗ 불일치'}")
    
    conn.close()

if __name__ == "__main__":
    test_password()
