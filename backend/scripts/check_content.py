import sys
import os
import sqlite3

DB_PATH = os.path.join(os.path.dirname(__file__), '../navercafe.db')

def check_content():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute("SELECT id, title, LENGTH(raw_text), image_urls, meta_json FROM items LIMIT 5")
    rows = cursor.fetchall()
    
    print(f"데이터베이스 항목 확인:\n")
    for row in rows:
        print(f"ID: {row[0]}")
        print(f"제목: {row[1]}")
        print(f"본문 길이: {row[2]} 글자")
        print(f"이미지 URLs: {row[3]}")
        print(f"메타데이터: {row[4][:100] if row[4] else 'None'}...")
        print("-" * 50)
    
    conn.close()

if __name__ == "__main__":
    check_content()
