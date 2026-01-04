import sys
import os

# Add backend directory to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), 'backend')))

from app.database import SessionLocal
from app.models.item import Item

def check_item_status():
    db = SessionLocal()
    try:
        from app.models.source import Source
        # List Sources
        sources = db.query(Source).all()
        print("Sources:")
        for s in sources:
            print(f"ID: {s.id}, Name: {s.name}, Type: {s.type}")
            
        print("\nLast 20 Items with Source Info:")
        items = db.query(Item.id, Item.title, Item.status, Source.type, Source.name)\
            .outerjoin(Source, Item.source_id == Source.id)\
            .order_by(Item.id.desc())\
            .limit(20)\
            .all()
            
        for item in items:
            type_str = item.type if item.type else "None"
            name_str = item.name if item.name else "None"
            print(f"ID: {item.id}, Type: {type_str:<10} Status: {item.status:<10} Title: {item.title[:20]}")
            
    finally:
        db.close()

if __name__ == "__main__":
    check_item_status()
