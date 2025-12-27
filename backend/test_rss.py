import feedparser
import requests
from bs4 import BeautifulSoup

def test_rss_fetch():
    blog_id = "486ldy"
    rss_url = f"https://rss.blog.naver.com/{blog_id}.xml"
    print(f"Fetching RSS: {rss_url}")
    
    try:
        response = requests.get(rss_url, timeout=10)
        print(f"Status Code: {response.status_code}")
        
        feed = feedparser.parse(response.text)
        print(f"Feed Title: {feed.feed.get('title', 'No Title')}")
        print(f"Number of Entries: {len(feed.entries)}")
        
        if len(feed.entries) > 0:
            print("\nLatest Entry:")
            entry = feed.entries[0]
            print(f"Title: {entry.title}")
            print(f"Published: {entry.get('published', 'No Date')}")
            print(f"Link: {entry.link}")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_rss_fetch()
