import sys
import os
from datetime import datetime, timedelta
import logging

# Add backend directory to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.database import SessionLocal
from app.models.source import Source
from app.models.item import Item
from connectors.factory import get_connector
from app.services.dedup_service import generate_url_hash, generate_content_hash
from app.services.classify_service import classify_item

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def collect_recent_posts(days=10):
    db = SessionLocal()
    cutoff_date = datetime.now() - timedelta(days=days)
    logger.info(f"Starting collection for posts newer than {cutoff_date}")
    
    try:
        # Get all enabled sources
        sources = db.query(Source).filter(Source.enabled == True).all()
        logger.info(f"Found {len(sources)} enabled sources")
        
        total_new_count = 0
        
        for source in sources:
            logger.info(f"--- Collecting from: {source.name} (ID: {source.id}) ---")
            try:
                connector = get_connector(source)
                if not connector:
                    logger.error(f"Connector not found for source {source.id}")
                    continue
                
                items_data = connector.fetch_list()
                logger.info(f"Fetched {len(items_data)} items")
                
                source_new_count = 0
                skipped_old = 0
                
                for item_data in items_data:
                    # Date filter
                    pub_date = item_data.get('published_at')
                    if pub_date and pub_date < cutoff_date:
                        skipped_old += 1
                        continue
                    
                    # Duplicate check by URL
                    url_hash = generate_url_hash(item_data['url'])
                    existing = db.query(Item).filter(Item.hash_url == url_hash).first()
                    if existing:
                        logger.debug(f"Skipping duplicate: {item_data['title']}")
                        continue
                    
                    # Save new item
                    content_hash = generate_content_hash(item_data.get('raw_text', ''))
                    category, region, tags = classify_item(item_data['title'], item_data.get('raw_text', ''))
                    
                    new_item = Item(
                        source_id=source.id,
                        source_item_id=item_data.get('source_item_id'),
                        title=item_data['title'],
                        url=item_data['url'],
                        published_at=pub_date,
                        raw_text=item_data.get('raw_text', ''),
                        summary_text=item_data.get('summary_text'),
                        image_urls=item_data.get('image_urls', []),
                        meta_json=item_data.get('meta_json', {}),
                        hash_url=url_hash,
                        hash_content=content_hash,
                        category=category,
                        region=region,
                        tags=tags,
                        status='collected'
                    )
                    db.add(new_item)
                    source_new_count += 1
                    logger.info(f"Added: {item_data['title']}")
                
                db.commit()
                logger.info(f"Source {source.id} finished: {source_new_count} new, {skipped_old} old skipped")
                total_new_count += source_new_count
                
            except Exception as e:
                logger.error(f"Error processing source {source.id}: {e}")
                db.rollback()
        
        logger.info(f"ALL DONE! Total new items saved: {total_new_count}")
        
    except Exception as e:
        logger.error(f"Global error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    collect_recent_posts(days=10)
