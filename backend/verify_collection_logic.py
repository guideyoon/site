import sys
import os

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from connectors.implementations.naver_blog import NaverBlogConnector
from datetime import datetime

def verify_collection():
    source_url = "https://blog.naver.com/486ldy"
    class MockSource:
        def __init__(self, url):
            self.base_url = url
            self.crawl_policy = None

    connector = NaverBlogConnector(MockSource(source_url))
    
    print(f"Fetching from: {source_url}")
    try:
        items = connector.fetch_list()
        print(f"Fetched {len(items)} items")
        
        # Check specifically for the christmas post
        target_found = False
        for item in items:
            # print(f"- {item['title']} ({item['published_at']})")
            if "크리스마스 요정" in item['title']:
                print(f"\n[SUCCESS] Found target post:")
                print(f"Title: {item['title']}")
                print(f"Date: {item['published_at']}")
                print(f"URL: {item['url']}")
                target_found = True
                break
        
        if not target_found:
            print("\n[FAILURE] Target post not found in fetched list.")
            if items:
                print("Latest items:")
                for i in range(min(5, len(items))):
                    print(f"- {items[i]['title']}")
                    
    except Exception as e:
        print(f"Error during collection: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    verify_collection()
