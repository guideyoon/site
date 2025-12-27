import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.database import SessionLocal
from app.models.source import Source
from app.api.routes.sources import SourceResponse
import json

def test_source_serialization():
    db = SessionLocal()
    try:
        source = db.query(Source).first()
        if not source:
            print("No sources found in DB.")
            return
        
        print(f"Testing serialization for: {source.name}")
        # Test Pydantic serialization
        resp = SourceResponse.model_validate(source)
        print("Successfully validated with Pydantic!")
        print(resp.model_dump_json(indent=2))
        
    except Exception as e:
        print(f"Error during serialization: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    test_source_serialization()
