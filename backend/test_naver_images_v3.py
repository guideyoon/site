import requests
from bs4 import BeautifulSoup
import re

def test_naver_mobile_images(url):
    print(f"Original URL: {url}")
    
    # Bypass using mobile URL
    if 'blog.naver.com' in url and 'm.blog.naver.com' not in url:
        match = re.search(r'blog\.naver\.com/([^/]+)/(\d+)', url)
        if match:
            blog_id = match.group(1)
            log_no = match.group(2)
            url = f"https://m.blog.naver.com/{blog_id}/{log_no}"
            print(f"Mobile Bypass URL: {url}")

    headers = {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
    }
    
    try:
        response = requests.get(url, headers=headers, timeout=10)
        print(f"Status Code: {response.status_code}")
        response.raise_for_status()
        
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # In mobile view, images are usually in .se-main-container or .se_component_wrap
        images = []
        
        # Try a more general search for post images
        # Naver mobile often uses data-lazy-src for performance
        for img in soup.find_all('img'):
            src = img.get('data-lazy-src') or img.get('src')
            if src and src.startswith('http') and 'stat.blog.naver.com' not in src:
                # Naver image URLs in mobile can be complex
                # We want the 'original' or 'w800' version if possible
                # Usually removing query params or changing type works
                if 'blogthumb.pstatic.net' in src:
                    continue # Skip thumbnails
                
                clean_url = src.split('?')[0]
                images.append(clean_url)

        # Remove duplicates
        images = list(dict.fromkeys(images))
        
        print(f"\nFinal count: {len(images)} images found.")
        for i, img in enumerate(images[:20]):
            print(f"{i+1}: {img}")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    url = "https://blog.naver.com/486ldy/223703977797"
    test_naver_mobile_images(url)
