import requests

def test_login():
    url = "http://localhost:8001/api/auth/login"
    data = {
        "username": "admin",
        "password": "admin1234"
    }
    print(f"Testing login at {url}...")
    try:
        response = requests.post(url, data=data)
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_login()
