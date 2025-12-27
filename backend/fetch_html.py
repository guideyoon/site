import requests
from bs4 import BeautifulSoup

url = 'https://m.blog.naver.com/486ldy/224122166413'
headers = {
    'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
    'Referer': 'https://m.blog.naver.com/'
}

try:
    r = requests.get(url, headers=headers, timeout=10)
    with open('naver_blog_mobile.html', 'w', encoding='utf-8') as f:
        f.write(r.text)
    print("Successfully saved to naver_blog_mobile.html")
    
    soup = BeautifulSoup(r.text, 'html.parser')
    container = soup.find('div', class_='se-main-container')
    if container:
        imgs = container.find_all('img')
        print(f"Found {len(imgs)} images in container.")
        for i, img in enumerate(imgs[:5]):
            print(f"Img {i}: {img.attrs}")
    else:
        print("Container .se-main-container not found")

except Exception as e:
    print(f"Error: {e}")
