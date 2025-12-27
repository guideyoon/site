import sys
import os
import sqlite3

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.auth import get_password_hash

DB_PATH = os.path.join(os.path.dirname(__file__), '../navercafe.db')

def reset_admin_password():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # 새 비밀번호 해시 생성
    new_password_hash = get_password_hash("admin123")
    
    # admin 계정 비밀번호 업데이트
    cursor.execute("UPDATE users SET hashed_password = ? WHERE username = 'admin'", (new_password_hash,))
    conn.commit()
    
    print(f"admin 계정 비밀번호가 'admin123'으로 재설정되었습니다.")
    print(f"새 해시: {new_password_hash}")
    
    conn.close()

if __name__ == "__main__":
    reset_admin_password()
