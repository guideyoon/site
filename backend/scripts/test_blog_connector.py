import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.models.source import Source
from connectors.implementations.naver_blog import NaverBlogConnector
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def test_blog_collection():
    # Sample Naver Blog: 울산광역시 (ulsan_korea)
    mock_source = Source(
        id=999,
        name="울산시 블로그",
        type="naver_blog",
        base_url="https://blog.naver.com/ulsan_korea",
        enabled=True
    )
    
    connector = NaverBlogConnector(mock_source)
    print(f"Testing collection for: {mock_source.name} ({mock_source.base_url})")
    
    items = connector.fetch_list()
    
    print(f"\nFetched {len(items)} items:")
    for i, item in enumerate(items[:5]):
        print(f"[{i+1}] {item['title']}")
        print(f"    URL: {item['url']}")
        print(f"    Date: {item['published_at']}")
        print(f"    Images: {len(item.get('image_urls', []))}")
        print("-" * 20)

if __name__ == "__main__":
    test_blog_collection()
