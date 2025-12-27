import requests
from bs4 import BeautifulSoup
import re

def test_naver_mobile_images(url):
    print(f"Original URL: {url}")
    
    # Bypass using mobile URL
    if 'blog.naver.com' in url and 'm.blog.naver.com' not in url:
        # url: https://blog.naver.com/486ldy/224122166413?fromRss=true...
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
        if response.status_code == 404:
            print("Received 404. Let's try the desktop iframe view instead.")
            return False
            
        response.raise_for_status()
        
        soup = BeautifulSoup(response.text, 'html.parser')
        
        images = []
        # In mobile view, SE_ONE uses .se_image
        content = soup.find('div', class_='se_component_wrap') or soup.find('div', class_='se-main-container')
        
        target = content if content else soup
        
        for img in target.find_all('img'):
            # data-lazy-src is common
            src = img.get('data-lazy-src') or img.get('src')
            if src and src.startswith('http') and 'stat.blog.naver.com' not in src:
                if 'blogthumb.pstatic.net' in src:
                    continue
                
                # Naver images often have ?type=...
                # Removing it usually gives original quality
                clean_url = src.split('?')[0]
                images.append(clean_url)

        images = list(dict.fromkeys(images))
        
        print(f"\nFinal count: {len(images)} images found.")
        for i, img in enumerate(images[:20]):
            print(f"{i+1}: {img}")
        
        return True
            
    except Exception as e:
        print(f"Error: {e}")
        return False

if __name__ == "__main__":
    # URL from the database
    url = "https://blog.naver.com/486ldy/224122166413?fromRss=true&trackingCode=rss"
    test_naver_mobile_images(url)
