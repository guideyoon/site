import sys
import os
import logging
from pathlib import Path

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Add backend to path
sys.path.append("/app")

try:
    from connectors.implementations.naver_blog import NaverBlogConnector
    from app.models.source import Source
except ImportError:
    # Local fallback
    sys.path.append(str(Path(__file__).parent.parent))
    from connectors.implementations.naver_blog import NaverBlogConnector
    # Mock Source
    class Source:
        def __init__(self, base_url):
            self.base_url = base_url
            self.type = "naver_blog"

def debug_blog():
    # Target: Ulsan City Official Blog (likely one of their sources)
    # blog.naver.com/ulsan_city
    test_urls = [
        "https://blog.naver.com/ulsan_city", 
        "https://blog.naver.com/ulsannews"
    ]
    
    for url in test_urls:
        print(f"\nDEBUG: Testing Naver Blog Collection for {url}")
        
        try:
            source = Source(url)
            # Need to mock attributes expected by connector if any (connector uses base_url)
            source.id = 999
            source.name = "Debug Blog"
            
            connector = NaverBlogConnector(source)
            
            # 1. Test RSS Fetch
            print("DEBUG: Fetching RSS List...")
            items = connector.fetch_list()
            print(f"DEBUG: RSS Result -> Found {len(items)} items")
            
            if len(items) > 0:
                print("DEBUG: RSS Success. Checking first item detail...")
                first_item = items[0]
                print(f" - Title: {first_item['title']}")
                print(f" - URL: {first_item['url']}")
                print(f" - Date: {first_item['published_at']}")
                
                # 2. Test Detail Fetch (Mobile Bypass)
                # fetch_list already calls fetch_detail internally for each item
                # But let's check if the result HAS content
                if first_item.get('raw_text'):
                    print(f"DEBUG: Content Extraction Success (Length: {len(first_item['raw_text'])})")
                    print(f"DEBUG: Images Found: {len(first_item.get('image_urls', []))}")
                else:
                    print("DEBUG: Content Extraction FAILED (Empty raw_text)")
                    print("DEBUG: Retrying fetch_detail manually...")
                    detail = connector.fetch_detail(first_item['url'])
                    print(f"Manual Detail Raw Length: {len(detail.get('raw_text', ''))}")
            else:
                print("DEBUG: RSS returned 0 items. Check Blog ID extraction or Naver Block.")
                # Debug extract ID
                blog_id = connector._extract_blog_id(url)
                print(f"DEBUG: Extracted Blog ID: {blog_id}")
                print(f"DEBUG: Constructed RSS URL: https://rss.blog.naver.com/{blog_id}.xml")
                
        except Exception as e:
            print(f"DEBUG: Critical Error: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    debug_blog()
