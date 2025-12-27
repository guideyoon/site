import sys
import os

# Add current dir to path
sys.path.append('/app')

try:
    from connectors.implementations.naver_blog import NaverBlogConnector
    
    source_data = type('obj', (object,), {
        'id': 3,
        'name': '냐옹씨 블로그',
        'base_url': 'https://blog.naver.com/486ldy'
    })
    
    connector = NaverBlogConnector(source_data)
    test_url = "https://blog.naver.com/486ldy/224122166413"
    print(f"Testing fetch_detail INSIDE WORKER for: {test_url}")
    
    detail = connector.fetch_detail(test_url)
    
    print(f"Text length: {len(detail['raw_text'])}")
    print(f"Image count: {len(detail['image_urls'])}")
    print("Images found:")
    for i, img in enumerate(detail['image_urls'][:3]):
        print(f"{i+1}: {img}")
    
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
