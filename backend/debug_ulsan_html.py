import requests
from bs4 import BeautifulSoup

def debug_ulsan():
    target_id = "ulsan_city"
    urls = [
        f"https://m.blog.naver.com/{target_id}",
        f"https://blog.naver.com/PostList.naver?blogId={target_id}&categoryNo=0"
    ]
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
        'Referer': 'https://m.naver.com/'
    }
    
    for url in urls:
        print(f"\n--- Fetching {url} ---")
        try:
            resp = requests.get(url, headers=headers, timeout=10)
            print(f"Status: {resp.status_code}")
            print(f"Effective URL: {resp.url}")
            
            soup = BeautifulSoup(resp.text, 'html.parser')
            print(f"Title: {soup.title.string if soup.title else 'No Title'}")
            
            # Check for common list containers
            containers = [
                '.list_post_article', '.post_list', '.list_item', '.card_item', 
                '#postListBody', '.blog_list', '.list_area'
            ]
            found = []
            for c in containers:
                if soup.select(c):
                    found.append(c)
            print(f"Found Containers: {found}")
            
            # Print text snippet
            text = soup.get_text(separator=' ', strip=True)[:200]
            print(f"Text Snippet: {text}")
            
            # Search for ANY links to posts
            print("Searching for post links...")
            links = soup.find_all('a', href=True)
            post_links = []
            for a in links:
                href = a['href']
                if f"/{target_id}/" in href and any(c.isdigit() for c in href.split('/')):
                     post_links.append(href)
                     
            print(f"Found {len(post_links)} potential post links.")
            if post_links:
                print(f"Samples: {post_links[:3]}")

        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    debug_ulsan()
