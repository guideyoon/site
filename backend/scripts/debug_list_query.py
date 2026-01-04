import sys
import os
sys.path.append('/app')
from app.database import SessionLocal
from app.models.item import Item
from app.models.source import Source
from app.models.user import User

def debug_query():
    db = SessionLocal()
    try:
        # 1. Search for 'g3g3'
        items = db.query(Item).filter(Item.title.ilike('%g3g3%')).all()
        print(f"Found {len(items)} items with title 'g3g3':")
        for i in items:
            print(f" - ID: {i.id} | Status: {i.status} | Date: {i.published_at} | SourceID: {i.source_id} | UserID: {i.user_id}")
            
        # 2. Check ALL Sources
        print("\nAll Sources:")
        sources = db.query(Source).all()
        for s in sources:
            print(f" - ID: {s.id} | Name: {s.name} | Type: {s.type} | UserID: {s.user_id}")
                
        # 3. Check ALL Users
        print("\nAll Users:")
        users = db.query(User).all()
        for u in users:
            print(f" - ID: {u.id} | Username: {u.username} | Role: {u.role}")

    finally:
        db.close()

if __name__ == "__main__":
    debug_query()
