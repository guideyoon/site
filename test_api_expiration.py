import requests
import json

BASE_URL = "http://localhost:8001"

def test_expired_login(username, password):
    print(f"Attempting login for {username}...")
    try:
        data = {
            "username": username,
            "password": password
        }
        # Login is form-encoded
        response = requests.post(f"{BASE_URL}/api/auth/login", data=data)
        print(f"Login Status: {response.status_code}")
        print(f"Login Response: {response.text}")
        
        if response.status_code == 403:
            print("SUCCESS: Login blocked as expected.")
        else:
            print("FAILURE: Login not blocked.")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    # Test with facecap (assuming password is known or can be guessed/set)
    # Since I don't know facecap's password, I'll attempt to call /api/auth/me with a valid token if I had one.
    # But checking login is enough if I can use a known password.
    # Let's try to register a new user, expire them, and then login.
    pass

def test_me_with_token(token):
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
    print(f"Me Status: {response.status_code}")
    print(f"Me Response: {response.text}")
