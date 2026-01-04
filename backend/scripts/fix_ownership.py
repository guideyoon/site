import sys
import os
sys.path.append('/app')
from app.database import SessionLocal
from app.models.item import Item
from app.models.source import Source
from app.models.user import User

def fix_ownership():
    db = SessionLocal()
    try:
        # Target Source ID 5 (Ulsan In)
        source = db.query(Source).get(5)
        if not source:
            print("Source 5 not found!")
            return
            
        print(f"Current Source 5 Owner: {source.user_id}")
        
        # Target Admin User ID 2
        admin = db.query(User).filter(User.username == 'admin').first()
        if not admin:
            print("Admin user not found!")
            return
            
        print(f"Transferring Source 5 to Admin ID {admin.id}...")
        source.user_id = admin.id
        
        # Update Items
        items = db.query(Item).filter(Item.source_id == 5).all()
        print(f"Updating {len(items)} items...")
        for item in items:
            item.user_id = admin.id
            
        db.commit()
        print("Transfer complete!")
        
    finally:
        db.close()

if __name__ == "__main__":
    fix_ownership()
