import sys
import os
from datetime import datetime

# Add backend to sys.path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')

from connectors.implementations.threads import ThreadsConnector

class MockSource:
    def __init__(self, base_url, type='threads'):
        self.base_url = base_url
        self.type = type
        self.name = "Test Threads Source"
        self.crawl_policy = None

def test_threads_connector():
    source = MockSource(base_url="https://www.threads.net/@zuck")
    connector = ThreadsConnector(source)
    
    print(f"Fetching posts from: {source.base_url}")
    try:
        items = connector.fetch_list()
        
        print(f"Found {len(items)} items.")
        
        for i, item in enumerate(items[:5]):
            print(f"\n--- Item {i+1} ---")
            print(f"Title: {item['title'][:50]}...")
            print(f"URL: {item['url']}")
            print(f"ID: {item['source_item_id']}")
            print(f"Published At: {item['published_at']}")
            print(f"Images: {len(item.get('image_urls', []))}")
            if item.get('image_urls'):
                print(f"First Image: {item['image_urls'][0][:50]}...")
            print(f"Meta: {item['meta_json']}")
            
        if not items:
            print("FAILED: No items found.")
            sys.exit(1)
            
        # Basic validation
        first = items[0]
        required_keys = ['title', 'url', 'source_item_id', 'published_at', 'raw_text']
        for key in required_keys:
            if key not in first:
                print(f"FAILED: Missing key '{key}' in item")
                sys.exit(1)
        
        print("\nSUCCESS: ThreadsConnector verification passed.")
        
    except Exception as e:
        print(f"ERROR during verification: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        connector.close()

if __name__ == "__main__":
    test_threads_connector()
