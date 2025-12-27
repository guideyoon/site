import sqlite3
import json

conn = sqlite3.connect('navercafe.db')
conn.row_factory = sqlite3.Row
cursor = conn.cursor()

cursor.execute('SELECT id, title, status, image_urls, meta_json FROM items')
rows = cursor.fetchall()

for r in rows:
    print(f"ID: {r['id']}")
    print(f"Title: {r['title']}")
    print(f"Status: {r['status']}")
    print(f"Images type: {type(r['image_urls'])}")
    print(f"Images: {r['image_urls']}")
    print(f"Meta: {r['meta_json']}")
    print("-" * 20)

conn.close()
