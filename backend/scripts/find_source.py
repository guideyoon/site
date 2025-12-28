from app.database import SessionLocal
from app.models.source import Source

db = SessionLocal()
try:
    sources = db.query(Source).filter(Source.base_url.contains("ulsanin_")).all()
    for s in sources:
        print(f"ID: {s.id}, Name: {s.name}, Enabled: {s.enabled}, URL: {s.base_url}")
finally:
    db.close()
