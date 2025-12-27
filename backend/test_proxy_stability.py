import requests
import concurrent.futures

base_url = "http://localhost:8001"
proxy_url = f"{base_url}/api/items/download-proxy"
target_url = "https://mblogthumb-phinf.pstatic.net/MjAyNTEyMjVfMjgz/MDAxNzY2NjMzNjE1Njk4.nXk-TSFr3nkrvk0ZLePEw6YEV07-WSkMBkNGYjjH8lcg.GvcRyY-zeL1CP-rRXH45utDxpPndugj1yRuwTUC2bFcg.JPEG/AA1SY6tW.jpg?type=w800"

# Need token
login_url = f"{base_url}/api/auth/login"
r = requests.post(login_url, data={"username": "admin", "password": "admin1234"})
token = r.json()["access_token"]
headers = {"Authorization": f"Bearer {token}"}

def test_proxy():
    r = requests.get(proxy_url, params={"url": target_url}, headers=headers, timeout=10)
    return r.status_code

def run_stress_test(n=10):
    print(f"Starting stress test with {n} requests...")
    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
        results = list(executor.map(lambda _: test_proxy(), range(n)))
    
    success_count = results.count(200)
    print(f"Results: {results}")
    print(f"Success: {success_count}/{n}")
    if success_count == n:
        print("STABILITY TEST PASSED")
    else:
        print("STABILITY TEST FAILED")

if __name__ == "__main__":
    run_stress_test(5)
