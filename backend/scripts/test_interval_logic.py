import sys
import os
from datetime import datetime, timezone, timedelta
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.database import SessionLocal
from app.models.source import Source

def check_task_logic():
    db = SessionLocal()
    try:
        sources = db.query(Source).filter(Source.enabled == True).all()
        now = datetime.now(timezone.utc)
        
        print(f"Checking {len(sources)} sources at {now}")
        for source in sources:
            should_collect = True
            reason = "First collection (None)"
            
            if source.last_collected_at:
                last_col = source.last_collected_at
                if last_col.tzinfo is None:
                    last_col = last_col.replace(tzinfo=timezone.utc)
                
                next_collect = last_col + timedelta(minutes=source.collect_interval)
                if now < next_collect:
                    should_collect = False
                    reason = f"Wait until {next_collect}"
                else:
                    reason = f"Past due (since {next_collect})"
            
            print(f"Source: {source.name}")
            print(f"  Interval: {source.collect_interval}m")
            print(f"  Last: {source.last_collected_at}")
            print(f"  Should Collect: {should_collect} ({reason})")
            print("-" * 20)
            
    finally:
        db.close()

if __name__ == "__main__":
    # Update one source to have a small interval and old last_collect for testing
    db = SessionLocal()
    s = db.query(Source).first()
    if s:
        s.collect_interval = 1
        s.last_collected_at = datetime.now(timezone.utc) - timedelta(minutes=2)
        db.commit()
    db.close()
    
    check_task_logic()
