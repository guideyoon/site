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
        # 1. Search for 'f3f'
        print("\nSearching for 'f3f'...")
        items = db.query(Item).filter(Item.title.ilike('%f3f%')).all()
        for i in items:
            print(f" - ID: {i.id} | Title: {i.title} | Status: {i.status} | Date: {i.published_at} | SrcID: {i.source_id} | UserID: {i.user_id}")
            
        # Check Source of found item
        if items:
            sid = items[0].source_id
            s = db.query(Source).get(sid)
            print(f" - Source {sid}: {s.name} (Type: {s.type} | UserID: {s.user_id})")

        # Simulate list_items API call exactly (Admin View)
        print("\nSimulating list_items (Admin, Limit 10):")
        query = db.query(Item).outerjoin(Source, Item.source_id == Source.id)
        query = query.filter(Item.status != "deleted")
        query = query.order_by(Item.published_at.desc().nullslast(), Item.collected_at.desc())
        results = query.limit(10).all()
        
        print(f"Top 10 Results:")
        found = False
        for item in results:
             print(f" - ID: {item.id} | Title: {item.title} | Date: {item.published_at} | UserID: {item.user_id}")
             if item.title == 'f3f': found = True
        
        if found: print(" -> 'f3f' is in the API result list.")
        else: print(" -> 'f3f' is NOT in the API result list.")

    finally:
        db.close()

if __name__ == "__main__":
    debug_query()
