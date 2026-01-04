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
        "https://blog.naver.com/ulsanin_"
    ]
    
    for url in test_urls:
        print(f"\nDEBUG: Testing Naver Blog Collection for {url}")
        
        try:
            # Fix: Use kwargs for SQLAlchemy model
            source = Source(base_url=url, type="naver_blog", name="Debug Blog")
            # Need to mock attributes expected by connector if any (connector uses base_url)
            source.id = 999
            
            connector = NaverBlogConnector(source)
            
            # 1. Test RSS Fetch
            print("DEBUG: Fetching RSS List...")
            # Modify the connector temporarily to use headers if strict mode
            # But here we just assume the connector code is as-is.
            items = connector.fetch_list()
            print(f"DEBUG: RSS Result -> Found {len(items)} items")
            
            if len(items) == 0:
                print("DEBUG: RSS returned 0 items. Investigating Raw Response...")
                import requests
                blog_id = connector._extract_blog_id(url)
                rss_url = f"https://rss.blog.naver.com/{blog_id}.xml"
                headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'application/xml,text/xml,*/*'
                }
                try:
                    resp = requests.get(rss_url, headers=headers, timeout=10)
                    print(f"DEBUG: Status Code: {resp.status_code}")
                    print(f"DEBUG: Content Preview:\n{resp.text[:200]}") # Shorten preview
                except Exception as e:
                    print(f"DEBUG: Manual Request Failed: {e}")
                
                # FALLBACK: Try Scraping Mobile List
                print("\nDEBUG: Attempting Mobile List Scraping (Fallback)...")
                mobile_url = f"https://m.blog.naver.com/{blog_id}"
                mobile_headers = {
                    'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
                    'Referer': 'https://m.naver.com/'
                }
                try:
                    m_resp = requests.get(mobile_url, headers=mobile_headers, timeout=10)
                    if m_resp.status_code == 200:
                        from bs4 import BeautifulSoup
                        soup = BeautifulSoup(m_resp.text, 'html.parser')
                        # Naver Mobile List usually has items in various structures. 
                        # Try common selectors for post list
                        # .list_item .title, .post_list .title etc.
                        # Actually the links often contain logNo.
                        
                        found_mobile_items = []
                        # Strategy: Look for specific class names common in mobile themes
                        candidates = soup.select('.list_post_article, .post_list .item, .list_item, .card_item')
                        
                        if not candidates:
                            # Fallback: find all links with logNo
                            print("DEBUG: No list classes found. Searching for links with logNo...")
                            links = soup.find_all('a', href=True)
                            for a in links:
                                href = a['href']
                                if f"blog.naver.com/{blog_id}/" in href or (f"/{blog_id}/" in href and 'logNo' not in href):
                                     # Likely a post link like /blogId/logNo
                                    parts = href.split('/')
                                    if parts[-1].isdigit():
                                        title = a.get_text(strip=True)
                                        if title:
                                            found_mobile_items.append({'title': title, 'url': f"https://m.blog.naver.com/{blog_id}/{parts[-1]}"})
                        else:
                            for c in candidates:
                                title_tag = c.select_one('.title, .ell')
                                link_tag = c.find('a') if c.name != 'a' else c
                                if title_tag and link_tag:
                                    href = link_tag.get('href')
                                    # Normalize href
                                    if href.startswith('/'):
                                        href = f"https://m.blog.naver.com{href}"
                                    found_mobile_items.append({
                                        'title': title_tag.get_text(strip=True),
                                        'url': href
                                    })

                        print(f"DEBUG: Mobile Scraping Found {len(found_mobile_items)} items")
                        for i in found_mobile_items[:3]:
                            print(f" - [Mobile] {i['title']} ({i['url']})")
                    else:
                        print(f"DEBUG: Mobile Site Failed: {m_resp.status_code}")
                except Exception as me:
                    print(f"DEBUG: Mobile Scraping Error: {me}")


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
