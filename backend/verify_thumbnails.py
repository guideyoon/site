import requests
import json

base_url = "http://localhost:8001"
login_url = f"{base_url}/api/auth/login"
items_url = f"{base_url}/api/items"

def verify():
    # 1. Login
    r = requests.post(login_url, data={"username": "admin", "password": "admin1234"})
    if r.status_code != 200:
        print(f"Login failed: {r.status_code}")
        return
    token = r.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Get Items
    r = requests.get(items_url, headers=headers, params={"limit": 5})
    if r.status_code != 200:
        print(f"Failed to fetch items: {r.status_code}")
        return
    
    items = r.json()
    print(f"Fetched {len(items)} items.")
    for item in items:
        print(f"ID: {item['id']}")
        print(f"Title: {item['title'][:20]}...")
        print(f"Thumbnail: {item.get('thumbnail_url')}")
        print("-" * 20)
    
    # Check if thumbnail is populated for source_id 3 (Naver)
    naver_items = [i for i in items if i['source_id'] == 3]
    if naver_items:
        t = naver_items[0].get('thumbnail_url')
        if t:
            print(f"SUCCESS: Thumbnail found for Naver item: {t}")
        else:
            print("FAILURE: Thumbnail missing for Naver item")
    else:
        print("No Naver items in the last 5 results.")

if __name__ == "__main__":
    verify()
