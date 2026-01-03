import sys
import os
from pathlib import Path

# Add backend to path
sys.path.append(str(Path(__file__).parent.parent))

from connectors.implementations.instagram import InstagramConnector

class MockSource:
    def __init__(self, base_url):
        self.base_url = base_url
        self.type = "instagram"
        self.name = "Test Instagram"
        self.crawl_policy = "{}"

def test_instagram():
    profile_url = "https://www.instagram.com/ulsaninsta/" 
    source = MockSource(profile_url)
    connector = InstagramConnector(source)
    
    print(f"Fetching from {profile_url}...")
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Accept-Language': 'en-US,en;q=0.9',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Pragma': 'no-cache',
        'Cache-Control': 'no-cache',
    }
    response = connector.client.get(profile_url, headers=headers)
    with open("instagram_debug.html", "w", encoding="utf-8") as f:
        f.write(response.text)
    print(f"Saved HTML to instagram_debug.html (Length: {len(response.text)})")
    
    items = connector.fetch_list()
    
    print(f"Found {len(items)} items")
    for item in items[:3]:
        print("-" * 20)
        print(f"Title: {item['title'][:100]}")
        print(f"URL: {item['url']}")
        print(f"Published: {item['published_at']}")
        print(f"Images: {len(item['image_urls'])}")

if __name__ == "__main__":
    test_instagram()
