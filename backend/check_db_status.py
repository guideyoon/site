import sys
import os
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from sqlalchemy import create_engine, text
# from app.config import settings

# Database URL (assuming default from docker-compose if env not set, but better use settings)
# settings.DATABASE_URL might need env vars.
# Backend uses SQLite
DATABASE_URL = "sqlite:///backend/navercafe.db"

def check_db():
    engine = create_engine(DATABASE_URL)
    with engine.connect() as conn:
        print("--- Checking Sources ---")
        result = conn.execute(text("SELECT id, name, type, base_url, enabled FROM sources WHERE base_url LIKE '%486ldy%'"))
        sources = result.fetchall()
        for s in sources:
            print(f"ID: {s.id}, Name: {s.name}, Type: {s.type}, Enabled: {s.enabled}")
            
            # Check items for this source
            print(f"  --- Recent Items for Source {s.id} ---")
            items_res = conn.execute(text(f"SELECT id, title, published_at, collected_at FROM items WHERE source_id = {s.id} ORDER BY published_at DESC LIMIT 5"))
            items = items_res.fetchall()
            if not items:
                print("  No items found.")
            for i in items:
                print(f"  Item: {i.title} (Published: {i.published_at}, Collected: {i.collected_at})")

if __name__ == "__main__":
    check_db()
