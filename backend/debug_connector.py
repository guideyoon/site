import sys
import os
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from connectors.implementations.naver_blog import NaverBlogConnector

def test_connector():
    # Source 3: 냐옹씨 블로그
    source_data = type('obj', (object,), {
        'id': 3,
        'name': '냐옹씨 블로그',
        'base_url': 'https://blog.naver.com/486ldy'
    })
    
    connector = NaverBlogConnector(source_data)
    
    # Test fetch_detail with one of the URLs
    test_url = "https://blog.naver.com/486ldy/224122166413" 
    print(f"Testing fetch_detail for: {test_url}")
    
    detail = connector.fetch_detail(test_url)
    
    print(f"Text length: {len(detail['raw_text'])}")
    print(f"Image count: {len(detail['image_urls'])}")
    print("Images found:")
    for i, img in enumerate(detail['image_urls'][:5]):
        print(f"{i+1}: {img}")
    
    # Check if thumbnail host is leaked
    leaked = [img for img in detail['image_urls'] if 'blogthumb' in img]
    print(f"Leaked thumbnails: {len(leaked)}")

if __name__ == "__main__":
    test_connector()
