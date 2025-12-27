import requests
import json

URL = "http://localhost:8001/api/auth/register"
DATA = {
    "username": "testlogin",
    "password": "test1234",
    "role": "viewer"
}

try:
    print(f"Sending POST to {URL}...")
    res = requests.post(URL, json=DATA)
    print(f"Status Code: {res.status_code}")
    print(f"Response: {res.text}")
except Exception as e:
    print(f"Error: {e}")
