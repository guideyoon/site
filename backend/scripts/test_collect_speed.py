import requests
import time

BASE_URL = "http://localhost:8000/api"

def login():
    resp = requests.post(f"{BASE_URL}/auth/login", data={"username": "admin", "password": "admin123"})
    if resp.status_code != 200:
        print(f"Login failed: {resp.status_code}")
        print(f"Response: {resp.text}")
        resp.raise_for_status()
    return resp.json()["access_token"]

def test_collect():
    token = login()
    headers = {"Authorization": f"Bearer {token}"}
    
    # Get sources
    resp = requests.get(f"{BASE_URL}/sources", headers=headers)
    sources = resp.json()
    if not sources:
        print("No sources found")
        return
    
    source_id = sources[0]["id"]
    print(f"Testing collection for source {source_id} ({sources[0]['name']})...")
    
    start_time = time.time()
    resp = requests.post(f"{BASE_URL}/sources/{source_id}/collect", headers=headers)
    end_time = time.time()
    
    print(f"Status Code: {resp.status_code}")
    print(f"Response Body: {resp.json()}")
    print(f"Time taken: {end_time - start_time:.4f} seconds")

if __name__ == "__main__":
    try:
        test_collect()
    except Exception as e:
        print(f"Error: {e}")
