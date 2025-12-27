import requests
from bs4 import BeautifulSoup
import re

def test_naver_blog_images(url):
    print(f"Original URL: {url}")
    
    # Correct iframe bypass for Naver Blog
    # Standard: https://blog.naver.com/PostView.naver?blogId={blogId}&logNo={logNo}
    if 'blog.naver.com' in url:
        match = re.search(r'blog\.naver\.com/([^/]+)/(\d+)', url)
        if match:
            blog_id = match.group(1)
            log_no = match.group(2)
            url = f"https://blog.naver.com/PostView.naver?blogId={blog_id}&logNo={log_no}&redirect=Dlog&widgetTypeCall=true&directAccess=false"
            print(f"Bypass URL: {url}")

    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://blog.naver.com/'
    }
    
    try:
        response = requests.get(url, headers=headers, timeout=10)
        print(f"Status Code: {response.status_code}")
        response.raise_for_status()
        
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Naver Smart Editor One (SE3/SE_ONE) images
        images = []
        
        # 1. Try Main Container
        content = soup.find('div', class_='se-main-container')
        if content:
            print("Found Smart Editor content.")
            for img in content.find_all('img'):
                # Naver uses original src or data-lazy-src
                src = img.get('data-lazy-src') or img.get('src')
                # Filter out small icons/stickers (usually have 'sticker' in URL or small size)
                if src and src.startswith('http') and 'stat.blog.naver.com' not in src:
                    # Naver image URLs often end with ?type=...
                    # We want the high quality one
                    base_src = src.split('?')[0]
                    images.append(base_src)
        
        # 2. Try older format (postViewArea)
        if not images:
            content = soup.find('div', id='postViewArea')
            if content:
                print("Found legacy content.")
                for img in content.find_all('img'):
                    src = img.get('src')
                    if src and src.startswith('http'):
                        images.append(src)

        # Remove duplicates
        images = list(dict.fromkeys(images))
        
        print(f"\nFinal count: {len(images)} images found.")
        for i, img in enumerate(images[:10]):
            print(f"{i+1}: {img}")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    # Example blog post with many images
    url = "https://blog.naver.com/486ldy/223703977797"
    test_naver_blog_images(url)
