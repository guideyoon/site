import sys
import os
import requests
import json
from datetime import datetime

# Configuration
BASE_URL = "http://localhost:8000"
# We need a token. We can simulate login or just use a hardcoded user if we run against DB directly,
# but using API is better to test the endpoint logic.
# However, we don't have the password easily.
# Let's use the DB directly to CREATE and DELETE, effectively simulating the backend logic, 
# OR use requests if we can login.

# Since we have DB access, let's test the QUERY Logic directly using models.
# This avoids auth complexity.

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), 'backend')))
from app.database import SessionLocal
from app.models.item import Item
from app.models.source import Source
from sqlalchemy import desc

def test_query_logic():
    db = SessionLocal()
    try:
        # 1. Create a dummy item
        source = db.query(Source).first()
        if not source:
            print("No source found")
            return

        new_item = Item(
            source_id=source.id,
            title="TEST_ITEM_DELETE_REPRO",
            url="http://test.com",
            status="collected",
            published_at=datetime.now()
        )
        db.add(new_item)
        db.commit()
        db.refresh(new_item)
        print(f"Created Item {new_item.id} with status {new_item.status}")

        # 2. Query like Dashboard (status=None -> should exclude deleted)
        # We manually replicate the route logic
        query = db.query(Item).filter(Item.status != "deleted")
        # Check if item is in results
        found = query.filter(Item.id == new_item.id).first()
        print(f"Dashboard Query (!= deleted): Found item? {found is not None}")

        # 3. Query like Box (status='collected')
        query_box = db.query(Item).filter(Item.status == "collected")
        found_box = query_box.filter(Item.id == new_item.id).first()
        print(f"Box Query (== collected): Found item? {found_box is not None}")

        # 4. "Delete" the item
        new_item.status = "deleted"
        db.commit()
        print(f"Deleted Item {new_item.id} (status set to 'deleted')")

        # 5. Query like Dashboard again
        query = db.query(Item).filter(Item.status != "deleted")
        found = query.filter(Item.id == new_item.id).first()
        print(f"Dashboard Query (!= deleted): Found item? {found is not None}")
        
        # 6. Query like Box again
        query_box = db.query(Item).filter(Item.status == "collected")
        found_box = query_box.filter(Item.id == new_item.id).first()
        print(f"Box Query (== collected): Found item? {found_box is not None}")
        
        # 7. Test 'queued' status scenario
        new_item.status = "queued"
        db.commit()
        print(f"Set Item {new_item.id} status to 'queued'")
        
        query = db.query(Item).filter(Item.status != "deleted")
        found = query.filter(Item.id == new_item.id).first()
        print(f"Dashboard Query (!= deleted): Found item? {found is not None}")
        
        query_box = db.query(Item).filter(Item.status == "collected")
        found_box = query_box.filter(Item.id == new_item.id).first()
        print(f"Box Query (== collected): Found item? {found_box is not None}")

        # Clean up
        db.delete(new_item)
        db.commit()
        
    finally:
        db.close()

if __name__ == "__main__":
    test_query_logic()
