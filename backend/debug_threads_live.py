import sys
import os
import logging
import re
from pathlib import Path

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Add backend to path (assuming we run from /app/scripts or /app)
sys.path.append("/app")

try:
    from connectors.implementations.threads import ThreadsConnector
except ImportError:
    # Local fallback
    sys.path.append(str(Path(__file__).parent.parent))
    from connectors.implementations.threads import ThreadsConnector

class MockSource:
    def __init__(self, base_url):
        self.base_url = base_url
        self.type = "threads"
        self.name = "Test Threads"
        self.crawl_policy = "{}"

def debug_threads():
    # Target the user's specific profile
    profile_url = "https://www.threads.net/@guideyoon"
    print(f"DEBUG: Testing Threads Collection for {profile_url}")
    
    source = MockSource(profile_url)
    connector = ThreadsConnector(source)
    
    try:
        # Manually triggering the fetch logic
        print("DEBUG: Sending Request...")
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
        
        # We access the internal client directly to inspect raw response if needed
        # But connector.fetch_list calls response.raise_for_status()
        
        items = connector.fetch_list()
        
        print(f"\nDEBUG: Result -> Found {len(items)} items")
        
        if len(items) == 0:
            print("DEBUG: 0 items found. Investigating RAW HTML...")
            response = connector.client.get(profile_url, headers=headers)
            html = response.text
            print(f"DEBUG: HTML Length: {len(html)}")
            
            if "RelayPrefetchedStreamCache" in html:
                print("DEBUG: 'RelayPrefetchedStreamCache' FOUND in HTML. Regex regex failure?")
                # Attempt manual regex debug
                match = re.search(r'({.*})', html) # This is a very naive regex from the original code
                if match:
                    print(f"DEBUG: Simple Regex matched JSON of length {len(match.group(1))}")
                else:
                    print("DEBUG: Simple Regex FAILED to match JSON block.")
            else:
                print("DEBUG: 'RelayPrefetchedStreamCache' NOT FOUND in HTML. Selector changed or Login Wall?")
                print(f"DEBUG: HTML Preview (First 500 chars):\n{html[:500]}")
        else:
            print("DEBUG: Items found! (Logic seems working)")
            for item in items[:3]:
                print(f" - {item['title'][:50]}... ({item.get('published_at')})")

    except Exception as e:
        print(f"DEBUG: Critical Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    debug_threads()
