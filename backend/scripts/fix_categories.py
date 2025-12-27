import sys
import os

# Add backend directory to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.database import SessionLocal
from app.models.item import Item
from app.services.classify_service import classify_item
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def fix_categories():
    db = SessionLocal()
    try:
        # Get items with missing categories
        items = db.query(Item).filter(Item.category == None).all()
        logger.info(f"Found {len(items)} items to classify")
        
        updated_count = 0
        for item in items:
            category, region, tags = classify_item(item.title, item.raw_text or "")
            item.category = category
            item.region = region
            item.tags = tags
            updated_count += 1
            if updated_count % 10 == 0:
                logger.info(f"Updated {updated_count} items...")
        
        db.commit()
        logger.info(f"SUCCESS: Categorized {updated_count} items")
        
    except Exception as e:
        logger.error(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    fix_categories()
