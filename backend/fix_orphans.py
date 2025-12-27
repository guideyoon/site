from sqlalchemy import text
from app.database import SessionLocal, engine
from app.models.user import User
from app.models.source import Source
from app.models.item import Item

def fix_orphans():
    db = SessionLocal()
    try:
        # Find the first admin
        admin = db.query(User).filter(User.role == "admin").first()
        if not admin:
            print("No admin user found. Please create one.")
            return
        
        print(f"Assigning orphaned data to admin: {admin.username} (ID: {admin.id})")
        
        # Update sources
        sources_updated = db.query(Source).filter(Source.user_id == None).update({Source.user_id: admin.id})
        print(f"Updated {sources_updated} orphaned sources.")
        
        # Update items
        items_updated = db.query(Item).filter(Item.user_id == None).update({Item.user_id: admin.id})
        print(f"Updated {items_updated} orphaned items.")
        
        db.commit()
        print("Success!")
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    fix_orphans()
