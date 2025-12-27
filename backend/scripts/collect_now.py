import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.database import SessionLocal
from app.models.source import Source
from app.models.item import Item
from connectors.factory import get_connector
from app.services.dedup_service import generate_url_hash, generate_content_hash
from datetime import datetime, timedelta
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def collect_directly():
    db = SessionLocal()
    try:
        source = db.query(Source).filter(Source.id == 1).first()
        if not source:
            print("소스를 찾을 수 없습니다!")
            return
        
        print(f"수집 시작: {source.name}")
        
        connector = get_connector(source)
        items_data = connector.fetch_list()
        print(f"수집된 항목: {len(items_data)}개")
        
        cutoff_date = datetime.now() - timedelta(days=10)
        new_count = 0
        
        for item_data in items_data:
            # 날짜 필터
            if item_data.get('published_at') and item_data['published_at'] < cutoff_date:
                continue
            
            # 중복 체크
            url_hash = generate_url_hash(item_data['url'])
            existing = db.query(Item).filter(Item.hash_url == url_hash).first()
            if existing:
                print(f"중복: {item_data['title']}")
                continue
            
            # 새 아이템 저장
            content_hash = generate_content_hash(item_data.get('raw_text', ''))
            
            new_item = Item(
                source_id=source.id,
                source_item_id=item_data['source_item_id'],
                title=item_data['title'],
                url=item_data['url'],
                published_at=item_data.get('published_at'),
                raw_text=item_data.get('raw_text', ''),
                image_urls=item_data.get('image_urls', []),
                meta_json=item_data.get('meta_json', {}),
                hash_url=url_hash,
                hash_content=content_hash,
                status='collected'
            )
            db.add(new_item)
            new_count += 1
            print(f"추가: {item_data['title']}")
        
        db.commit()
        print(f"\n완료! {new_count}개 항목 저장됨")
        
    except Exception as e:
        print(f"오류: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    collect_directly()
