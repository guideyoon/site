import sys
import os
import logging

# Add backend directory to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from connectors.implementations.generic_board import GenericBoardConnector
from app.models.source import Source

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_ulsan_collection():
    print(">>> 울산광역시청 수집 테스트 시작")
    
    # Mock Source object
    source = Source(
        id=1,
        name="울산광역시청",
        type="generic_board",
        base_url="https://www.ulsan.go.kr",
        crawl_policy='{"list_url": "https://www.ulsan.go.kr/u/rep/bbs/list.ulsan?bbsId=BBS_0000000000000003&mId=001004001001000000"}'
    )
    
    connector = GenericBoardConnector(source)
    
    print(f"Target URL: {source.base_url}")
    
    try:
        items = connector.fetch_list()
        
        print(f"\n>>> 수집 결과: {len(items)}개 항목 발견")
        
        for i, item in enumerate(items[:3]): # Show top 3
            print(f"\n[Item {i+1}]")
            print(f"Title: {item['title']}")
            print(f"Date: {item['published_at']}")
            print(f"URL: {item['url']}")
            print(f"Content Length: {len(item.get('raw_text', ''))} chars")
            print(f"Content Preview: {item.get('raw_text', '')[:100].replace(chr(10), ' ')}...")
            
            # Check attachments
            meta = item.get('meta_json', {})
            attachments = meta.get('attachments', [])
            if attachments:
                print(f"Attachments ({len(attachments)}):")
                for att in attachments:
                    print(f" - {att['name']}: {att['url']}")
            else:
                print("Attachments: None")
                
    except Exception as e:
        logger.error(f"테스트 실패: {e}", exc_info=True)

if __name__ == "__main__":
    test_ulsan_collection()
