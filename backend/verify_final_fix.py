import requests

base_url = "http://localhost:8001"
login_url = f"{base_url}/api/auth/login"

def verify_final():
    # 1. Login to get an ID
    r = requests.post(login_url, data={"username": "admin", "password": "admin1234"})
    token = r.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # Get last item ID for Naver
    r = requests.get(f"{base_url}/api/items", headers=headers, params={"limit": 1})
    item_id = r.json()[0]["id"]
    
    # 2. Check get_item for thumbnail_url
    print(f"Checking get_item for ID {item_id}...")
    r = requests.get(f"{base_url}/api/items/{item_id}", headers=headers)
    data = r.json()
    thumb = data.get("thumbnail_url")
    print(f"Thumbnail URL: {thumb}")
    if thumb:
        print("SUCCESS: thumbnail_url found in get_item detail.")
    else:
        print("FAILURE: thumbnail_url missing in get_item detail.")
    
    # 3. Check proxy headers (Access-Control-Expose-Headers and Cache-Control)
    print("\nChecking Proxy Headers...")
    r = requests.get(f"{base_url}/api/items/download-proxy", params={"url": thumb})
    print(f"Status: {r.status_code}")
    print(f"Content-Disposition: {r.headers.get('Content-Disposition')}")
    print(f"Cache-Control: {r.headers.get('Cache-Control')}")
    
    if "inline" in r.headers.get('Content-Disposition', '').lower():
        print("SUCCESS: Proxy is now using inline disposition by default.")
    else:
        print("WARNING: Proxy still using attachment or missing disposition.")

if __name__ == "__main__":
    verify_final()
