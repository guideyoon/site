from worker.celery_app import celery_app
from app.database import SessionLocal
from app.models.source import Source
from app.models.item import Item
from connectors.factory import get_connector
from app.services.dedup_service import generate_url_hash, generate_content_hash
from worker.tasks.processing import parse_and_store
import logging

logger = logging.getLogger(__name__)


@celery_app.task(name='worker.tasks.collection.collect_all_sources', bind=True, max_retries=3)
def collect_all_sources(self):
    """Collect from all enabled sources belonging to active users"""
    db = SessionLocal()
    try:
        from app.models.user import User
        from datetime import datetime, timezone, timedelta
        now = datetime.now(timezone.utc)
        
        # Filter sources that are enabled AND whose owners are not expired
        sources = db.query(Source).join(User, Source.user_id == User.id).filter(
            Source.enabled == True
        ).all()
        
        triggered_count = 0
        for source in sources:
            try:
                # Check owner expiration again (just in case query join was complex)
                owner = db.query(User).filter(User.id == source.user_id).first()
                if owner and owner.expires_at:
                    expires_at = owner.expires_at
                    if expires_at.tzinfo is None:
                        expires_at = expires_at.replace(tzinfo=timezone.utc)
                    if now > expires_at:
                        logger.info(f"Skipping source {source.name} because owner {owner.username} is expired")
                        continue

                # Check if it's time to collect
                should_collect = True
                if source.last_collected_at:
                    last_col = source.last_collected_at
                    if last_col.tzinfo is None:
                        last_col = last_col.replace(tzinfo=timezone.utc)
                    
                    if now < last_col + timedelta(minutes=source.collect_interval):
                        should_collect = False
                
                if should_collect:
                    collect_source.delay(source.id)
                    triggered_count += 1
                    logger.info(f"Triggered collection for {source.name} (interval: {source.collect_interval}m)")
            except Exception as e:
                logger.error(f"Failed to check/trigger collection for source {source.id}: {e}")
        
        return {"message": f"Triggered collection for {triggered_count} sources"}
    finally:
        db.close()


@celery_app.task(name='worker.tasks.collection.collect_source', bind=True, max_retries=3)
def collect_source(self, source_id: int):
    """Collect from a specific source"""
    db = SessionLocal()
    try:
        source = db.query(Source).filter(Source.id == source_id).first()
        if not source:
            logger.error(f"Source {source_id} not found")
            return {"error": "Source not found"}
        
        # Check if owner is expired
        from app.models.user import User
        from datetime import datetime, timezone
        owner = db.query(User).filter(User.id == source.user_id).first()
        if owner and owner.expires_at:
            now = datetime.now(timezone.utc)
            expires_at = owner.expires_at
            if expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=timezone.utc)
            if now > expires_at:
                logger.warning(f"Aborting collection for source {source.name}: owner {owner.username} is expired")
                return {"message": "Owner expired"}

        if not source.enabled:
            logger.info(f"Source {source_id} is disabled, skipping")
            return {"message": "Source disabled"}
        
        logger.info(f"Collecting from source: {source.name} ({source.type})")
        
        # Get connector
        connector = get_connector(source)
        if not connector:
            logger.error(f"No connector found for source {source_id}")
            return {"error": "No connector available"}
        
        # Fetch items
        items_data = connector.fetch_list()
        logger.info(f"Fetched {len(items_data)} items from {source.name}")
        
        
        new_count = 0
        skipped_old = 0
        from datetime import datetime, timezone, timedelta
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=10)
        
        for item_data in items_data:
            # Skip items older than 10 days (if date is available)
            pub_date = item_data.get('published_at')
            if pub_date:
                if pub_date.tzinfo is None:
                    pub_date = pub_date.replace(tzinfo=timezone.utc)
                if pub_date < cutoff_date:
                    skipped_old += 1
                    logger.debug(f"Skipping old item: {item_data['title']} ({item_data['published_at']})")
                    continue
            
            # Check if already exists by URL
            url_hash = generate_url_hash(item_data['url'])
            existing = db.query(Item).filter(Item.hash_url == url_hash).first()
            
            if existing:
                logger.debug(f"Item already exists: {item_data['url']}")
                continue
            
            # Parse and store
            parse_and_store.delay(source_id, item_data)
            new_count += 1
        
        # Update last_collected_at
        from datetime import datetime, timezone
        source.last_collected_at = datetime.now(timezone.utc)
        db.commit()
        
        logger.info(f"Found {new_count} new items from {source.name} (skipped {skipped_old} old items)")
        return {
            "message": f"Collected {new_count} new items", 
            "total_fetched": len(items_data),
            "skipped_old": skipped_old
        }

        
    except Exception as e:
        logger.error(f"Error collecting from source {source_id}: {e}")
        raise self.retry(exc=e, countdown=60)
    finally:
        db.close()
