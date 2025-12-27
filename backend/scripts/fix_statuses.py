from app.database import SessionLocal
from app.models.item import Item

db = SessionLocal()
try:
    items = db.query(Item).filter(Item.status == 'pending').all()
    count = 0
    for item in items:
        item.status = 'collected'
        count += 1
    db.commit()
    print(f"Updated {count} items to collected")
finally:
    db.close()
