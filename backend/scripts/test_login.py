import requests

URL = "http://localhost:8001/api/auth/login"
DATA = {
    "username": "testlogin",
    "password": "test1234"
}

try:
    print(f"Sending POST to {URL}...")
    # OAuth2PasswordRequestForm expects form data, not JSON
    res = requests.post(URL, data=DATA)
    print(f"Status Code: {res.status_code}")
    if res.status_code == 200:
        print("Login Success!")
        print(f"Token: {res.json().get('access_token')[:10]}...")
    else:
        print(f"Login Failed: {res.text}")
except Exception as e:
    print(f"Error: {e}")
