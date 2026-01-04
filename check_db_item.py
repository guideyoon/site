import sys
import os

# Add backend directory to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), 'backend')))

from app.database import SessionLocal
from app.models.item import Item

def check_last_item():
    db = SessionLocal()
    try:
        # item = db.query(Item).order_by(Item.id.desc()).first()
        item = db.query(Item).filter(Item.title.like('%윤훼이%')).first()
        if item:
            print(f"found ID: {item.id}")
            print(f"Title: {item.title}")
            print(f"Raw Text Length: {len(item.raw_text)}")
            print(f"Image URLs Count: {len(item.image_urls) if item.image_urls else 0}")
            if item.image_urls:
                print(f"First Image: {item.image_urls[0]}")
        else:
            print("Item not found.")
    finally:
        db.close()

if __name__ == "__main__":
    check_last_item()
