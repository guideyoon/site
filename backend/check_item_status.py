import sys
import os
# Inside Docker, /app is in PYTHONPATH, so we can import app directly
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
            last_col = str(s.last_collected_at)[:19] if s.last_collected_at else "None"
            print(f"ID: {s.id}, Name: {s.name}, Type: {s.type}, Enabled: {s.enabled}, LastCol: {last_col}")
            
        print("\nTop 10 Items (Dashboard Order - Published At DESC):")
        items = db.query(Item.id, Item.title, Item.status, Source.type, Source.name, Item.published_at)\
            .outerjoin(Source, Item.source_id == Source.id)\
            .order_by(Item.published_at.desc().nullslast(), Item.collected_at.desc())\
            .limit(10)\
            .all()
            
        for item in items:
            type_str = item.type if item.type else "None"
            print(f"ID: {item.id}, Type: {type_str:<10} Status: {item.status:<10} Date: {str(item.published_at)[:19]} Title: {item.title[:20]}")
            
    finally:
        db.close()

if __name__ == "__main__":
    check_item_status()
