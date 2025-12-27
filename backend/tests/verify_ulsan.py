
import sys
import os
import logging

# Add backend directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from connectors.implementations.generic_board import GenericBoardConnector
from app.models.source import Source

# Mock Source object
class MockSource:
    def __init__(self, url):
        self.base_url = url
        self.crawl_policy = None
        self.name = "Test Ulsan"
        self.type = "generic_board"

# Setup logging
logging.basicConfig(level=logging.INFO)

def verify_ulsan():
    url = "https://www.ulsan.go.kr/u/rep/bbs/list.ulsan?bbsId=BBS_0000000000000003&mId=001004001001000000"
    source = MockSource(url)
    connector = GenericBoardConnector(source)
    
    print(f"Testing connector with URL: {url}")
    items = connector.fetch_list()
    
    print(f"Found {len(items)} items")
    for i, item in enumerate(items[:3]):
        print(f"Item {i+1}:")
        print(f"  Title: {item['title']}")
        print(f"  Date: {item.get('published_at')}")
        print(f"  URL: {item['url']}")
        
        # Verify valid date
        if item.get('published_at') and item['published_at'].year > 2020:
            print("  ✅ Date valid")
        else:
            print("  ❌ Date missing or invalid")

if __name__ == "__main__":
    verify_ulsan()
