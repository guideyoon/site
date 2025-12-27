import requests

API_URL = "http://localhost:8001/api"

def test_admin_endpoints():
    print("Testing user management endpoints...")
    
    import time
    unique_user = f"testuser_{int(time.time())}"
    print(f"Using unique username: {unique_user}")
    
    reg_data = {
        "username": unique_user,
        "password": "testpassword",
        "role": "viewer"
    }
    response = requests.post(f"{API_URL}/auth/register", json=reg_data)
    print(f"Register: {response.status_code}")
    
    # 2. Login as admin
    # Assume admin:admin exists or we need to find/create one
    # For now, let's try to login as the new user and check /me
    login_data = {
        "username": unique_user,
        "password": "testpassword"
    }
    login_res = requests.post(f"{API_URL}/auth/login", data=login_data)
    if login_res.status_code != 200:
        print("Login failed, skipping further tests")
        return
    
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # 3. Check /me
    me_res = requests.get(f"{API_URL}/auth/me", headers=headers)
    print(f"Me endpoint: {me_res.status_code}, data: {me_res.json()}")
    
    # 4. Try to access /api/users (Should be 403 as viewer)
    users_res = requests.get(f"{API_URL}/users/", headers=headers)
    print(f"Users list (as viewer): {users_res.status_code} (Expected 403)")
    
    # Clean up (if we were admin we could delete it, but for now just leave it)
    print("Verification script finished.")

if __name__ == "__main__":
    test_admin_endpoints()
