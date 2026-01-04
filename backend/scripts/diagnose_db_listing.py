import sys
import os
sys.path.append('/app')

from app.database import SessionLocal
from app.models.item import Item
from app.models.source import Source
from app.models.user import User
from sqlalchemy import desc

def diagnose():
    db = SessionLocal()
    try:
        print("--- DB Listing Diagnosis ---")
        
        # 1. Global Stats
        total_items = db.query(Item).count()
        deleted_items = db.query(Item).filter(Item.status == 'deleted').count()
        collected_items = db.query(Item).filter(Item.status == 'collected').count()
        print(f"Total: {total_items} | Collected: {collected_items} | Deleted: {deleted_items}")
        
        # 2. Check Admin User
        admin = db.query(User).filter(User.username == 'admin').first()
        print(f"Admin User: ID={admin.id}, Role={admin.role}")
        
        # 3. List recent items (ALL)
        print("\nRecent 20 Items (Raw SQL order):")
        recent = db.query(Item).order_by(Item.id.desc()).limit(20).all()
        for i in recent:
            source = db.query(Source).filter(Source.id == i.source_id).first()
            s_name = source.name if source else "MISSING"
            print(f"ID: {i.id:3} | Status: {i.status:10} | UserID: {i.user_id} | SrcID: {i.source_id:2} ({s_name:10}) | Date: {i.published_at} | Title: {i.title}")

        # 4. Simulate list_items query with the exact join
        print("\nSimulating list_items join (Admin View, Status != 'deleted'):")
        query = db.query(
            Item, 
            Source.name.label('source_name'), 
            Source.type.label('source_type')
        ).outerjoin(Source, Item.source_id == Source.id)
        
        query = query.filter(Item.status != "deleted")
        query = query.order_by(Item.published_at.desc().nullslast(), Item.collected_at.desc())
        
        results = query.limit(20).all()
        print(f"Query returned {len(results)} items.")
        for item, s_name, s_type in results:
             print(f"ID: {item.id:3} | PubAt: {item.published_at} | CollAt: {item.collected_at} | Title: {item.title[:20]}")

    finally:
        db.close()

if __name__ == "__main__":
    diagnose()
