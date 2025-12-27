import requests
from bs4 import BeautifulSoup
import urllib.parse

def test_image_extraction(url):
    print(f"Testing URL: {url}")
    
    # Naver blog iframe bypass
    if 'blog.naver.com' in url and '/PostView.naver' not in url:
        # url example: https://blog.naver.com/486ldy/223696884610
        parts = url.split('/')
        blog_id = parts[3]
        log_no = parts[4].split('?')[0]
        url = f"https://blog.naver.com/PostView.naver?blogId={blog_id}&logNo={log_no}"
        print(f"Bypassed URL: {url}")

    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
    
    try:
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Find images in the actual post content area
        # Naver blog uses various containers, often with class 'se-main-container' or 'postViewArea'
        images = []
        content_area = soup.find('div', class_='se-main-container') or soup.find('div', id='postViewArea')
        
        if content_area:
            print("Found content area.")
            for img in content_area.find_all('img'):
                src = img.get('src') or img.get('data-lazy-src')
                if src and src.startswith('http') and 'stat.blog.naver.com' not in src:
                    images.append(src)
        else:
            print("Could not find specific content area, checking all images.")
            for img in soup.find_all('img'):
                src = img.get('src')
                if src and src.startswith('http'):
                    images.append(src)
                    
        print(f"Found {len(images)} images:")
        for i, img_url in enumerate(images[:5]):
            print(f"{i+1}: {img_url}")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    # Example URL from 냐옹씨 블로그
    test_url = "https://blog.naver.com/486ldy/223703977797"
    test_image_extraction(test_url)
