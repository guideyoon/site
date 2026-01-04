from worker.celery_app import celery_app
from app.database import SessionLocal
from app.models.item import Item
from app.services.dedup_service import generate_url_hash, generate_content_hash, process_deduplication
from app.services.classify_service import classify_item
from app.services.summarize_service import summarize_content
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


@celery_app.task(name='worker.tasks.processing.parse_and_store', bind=True, max_retries=3)
def parse_and_store(self, source_id: int, item_data: dict):
    """Parse item data and store in database"""
    db = SessionLocal()
    try:
        # Generate hashes
        url_hash = generate_url_hash(item_data['url'])
        content_hash = generate_content_hash(item_data.get('raw_text', ''))
        
        # Get source to assign user_id
        from app.models.source import Source
        source = db.query(Source).filter(Source.id == source_id).first()
        user_id = source.user_id if source else None

        # Create item
        new_item = Item(
            source_id=source_id,
            source_item_id=item_data.get('source_item_id'),
            title=item_data['title'],
            published_at=item_data.get('published_at'),
            url=item_data['url'],
            raw_text=item_data.get('raw_text'),
            hash_url=url_hash,
            hash_content=content_hash,
            image_urls=item_data.get('image_urls', []),
            meta_json=item_data.get('meta_json', {}),
            status='collected',
            user_id=user_id
        )
        
        db.add(new_item)
        db.commit()
        db.refresh(new_item)
        
        logger.info(f"Stored new item: {new_item.id} - {new_item.title}")
        
        # Trigger processing
        dedup_classify_summarize.delay(new_item.id)
        
        return {"item_id": new_item.id, "title": new_item.title}
        
    except Exception as e:
        logger.error(f"Error parsing and storing item: {e}")
        db.rollback()
        raise self.retry(exc=e, countdown=30)
    finally:
        db.close()


@celery_app.task(name='worker.tasks.processing.dedup_classify_summarize', bind=True, max_retries=3)
def dedup_classify_summarize(self, item_id: int):
    """Process item: deduplication, classification, and summarization"""
    db = SessionLocal()
    try:
        item = db.query(Item).filter(Item.id == item_id).first()
        if not item:
            logger.error(f"Item {item_id} not found")
            return {"error": "Item not found"}
        
        logger.info(f"Processing item {item_id}: {item.title}")
        
        # Deduplication
        dup_count = process_deduplication(db, item)
        logger.info(f"Found {dup_count} duplicates for item {item_id}")
        
        # Classification
        category, region, tags = classify_item(item.title, item.raw_text or "")
        item.category = category
        item.region = region
        item.tags = tags
        logger.info(f"Classified item {item_id}: category={category}, region={region}")
        
        # Summarization
        if item.raw_text:
            summary = summarize_content(item.raw_text)
            item.summary_text = summary
            logger.info(f"Generated summary for item {item_id}")
        
        db.commit()
        
        return {
            "item_id": item_id,
            "category": category,
            "region": region,
            "tags": tags,
            "duplicates": dup_count
        }
        
    except Exception as e:
        logger.error(f"Error processing item {item_id}: {e}")
        db.rollback()
        raise self.retry(exc=e, countdown=30)
    finally:
        db.close()
