import requests
import json

def test_item_api(item_id):
    url = f"http://localhost:8000/api/items/{item_id}"
    # Assuming we need a token. I'll login first.
    login_url = "http://localhost:8000/api/auth/login"
    login_data = {"username": "admin", "password": "admin123"}
    
    r = requests.post(login_url, data=login_data)
    if r.status_code != 200:
        print(f"Login failed: {r.status_code}")
        return
    
    token = r.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    r = requests.get(url, headers=headers)
    if r.status_code == 200:
        print(json.dumps(r.json(), indent=2))
    else:
        print(f"GET failed: {r.status_code}")

if __name__ == "__main__":
    test_item_api(1)
    test_item_api(2)
