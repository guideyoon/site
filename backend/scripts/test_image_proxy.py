import requests
import json

def test_image_proxy():
    # Login to get token
    login_url = "http://localhost:8000/api/auth/login"
    login_data = {"username": "admin", "password": "admin123"}
    r = requests.post(login_url, data=login_data)
    token = r.json()["access_token"]
    
    # Test download-proxy with direct image URL
    url = "http://localhost:8000/api/items/download-proxy"
    image_url = "https://www.ulsan.go.kr/u/storyCms1/getImage.do?atchFileId=FILE_000000000093695&fileSn=1"
    params = {"url": image_url, "filename": "image.jpg"}
    headers = {"Authorization": f"Bearer {token}"}
    
    r = requests.get(url, params=params, headers=headers)
    print(f"Status: {r.status_code}")
    if r.status_code == 200:
        print(f"Length: {len(r.content)}")
    else:
        print(f"Response: {r.text}")

if __name__ == "__main__":
    test_image_proxy()
