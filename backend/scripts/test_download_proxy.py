import requests
import json

def test_download_proxy():
    # Login to get token
    login_url = "http://localhost:8000/api/auth/login"
    login_data = {"username": "admin", "password": "admin123"}
    r = requests.post(login_url, data=login_data)
    token = r.json()["access_token"]
    
    # Test download-proxy
    url = "http://localhost:8000/api/items/download-proxy"
    target_url = "https://www.ulsan.go.kr/u/storyCms1/getImage.do?atchFileId=FILE_000000000093695&fileSn=1"
    params = {"url": target_url, "filename": "test.jpg"}
    headers = {"Authorization": f"Bearer {token}"}
    
    r = requests.get(url, params=params, headers=headers)
    print(f"Status: {r.status_code}")
    if r.status_code != 200:
        print(f"Response: {r.text}")
    else:
        print(f"Content-Type: {r.headers.get('Content-Type')}")
        print(f"Content-Disposition: {r.headers.get('Content-Disposition')}")
        print(f"Length: {len(r.content)}")

if __name__ == "__main__":
    test_download_proxy()
