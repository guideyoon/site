import sys
import os
from dotenv import load_dotenv

# Load .env file
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.database import SessionLocal
from app.models.item import Item
from app.models.source import Source

def check_db_for_source(blog_id):
    db = SessionLocal()
    try:
        # 1. Find the source
        source = db.query(Source).filter(Source.base_url.contains(blog_id)).first()
        if not source:
            print(f"Source with '{blog_id}' not found in DB.")
            return
            
        print(f"Found Source: ID={source.id}, Name={source.name}, Enabled={source.enabled}")
        
        # 2. Check items for this source
        items = db.query(Item).filter(Item.source_id == source.id).order_by(Item.collected_at.desc()).all()
        print(f"Total items for this source: {len(items)}")
        
        for item in items[:5]:
            print(f"[{item.id}] Status={item.status}, Title={item.title}")
            print(f"    URL: {item.url}")
            print(f"    Published: {item.published_at}")
            print(f"    Collected: {item.collected_at}")
            print("-" * 20)
            
    finally:
        db.close()

if __name__ == "__main__":
    check_db_for_source("ulsanin_")
