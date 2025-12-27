import requests
import json
import urllib.parse

def test_download_proxy_content():
    # Login to get token
    login_url = "http://localhost:8000/api/auth/login"
    login_data = {"username": "admin", "password": "admin123"}
    r = requests.post(login_url, data=login_data)
    token = r.json()["access_token"]
    
    # Test download-proxy with HHBbs snippet
    url = "http://localhost:8000/api/items/download-proxy"
    hhbbs_snippet = "HHBbs.EncDownFile('/u','BBS_0000000000000003','xjmfCOeZ0qhRd2vgYYpz+RNHpLsVPvyx3nnAsiKLEiA=','JWyofO5U5CYzjCoHuM9qTA=='); return false;"
    params = {"url": hhbbs_snippet, "filename": "poster.png"}
    headers = {"Authorization": f"Bearer {token}"}
    
    r = requests.get(url, params=params, headers=headers)
    print(f"Status: {r.status_code}")
    print(f"Content: {r.text}")

if __name__ == "__main__":
    test_download_proxy_content()
