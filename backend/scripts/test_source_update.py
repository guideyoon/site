import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.database import SessionLocal
from app.models.source import Source
from app.api.routes.sources import update_source, SourceUpdate
import asyncio
from unittest.mock import MagicMock

async def test_update_logic():
    db = SessionLocal()
    try:
        source = db.query(Source).first()
        if not source:
            print("No sources found.")
            return
        
        print(f"Testing update for source ID {source.id}: {source.name}")
        
        # Simulate update_source call
        update_data = SourceUpdate(
            name=source.name + " (Updated)",
            collect_interval=45
        )
        
        # Mock current_user
        mock_user = MagicMock()
        mock_user.role = "admin"
        
        updated_source = await update_source(
            source_id=source.id,
            source_data=update_data,
            db=db,
            current_user=mock_user
        )
        
        print(f"Updated Name: {updated_source.name}")
        print(f"Updated Interval: {updated_source.collect_interval}")
        
        # Verify in DB
        db.refresh(source)
        print(f"DB Name: {source.name}")
        print(f"DB Interval: {source.collect_interval}")
        
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(test_update_logic())
