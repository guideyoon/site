import sys
import os
from pathlib import Path

# Add backend to path
sys.path.append(str(Path(__file__).parent.parent))

from connectors.implementations.threads import ThreadsConnector

class MockSource:
    def __init__(self, base_url):
        self.base_url = base_url
        self.type = "threads"
        self.name = "Test Threads"
        self.crawl_policy = "{}"

def test_threads():
    # Example Threads profile
    profile_url = "https://www.threads.net/@meta" 
    source = MockSource(profile_url)
    connector = ThreadsConnector(source)
    
    print(f"Fetching from {profile_url}...")
    items = connector.fetch_list()
    
    print(f"Found {len(items)} items")
    for item in items[:3]:
        print("-" * 20)
        print(f"Title: {item['title'][:100]}")
        print(f"URL: {item['url']}")
        print(f"Published: {item['published_at']}")

if __name__ == "__main__":
    test_threads()
