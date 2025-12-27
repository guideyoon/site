import requests

base_url = "http://localhost:8001"
proxy_url = f"{base_url}/api/items/download-proxy"
# Use a known thumbnail URL from previous tests
target_url = "https://mblogthumb-phinf.pstatic.net/MjAyNTEyMjVfMjgz/MDAxNzY2NjMzNjE1Njk4.nXk-TSFr3nkrvk0ZLePEw6YEV07-WSkMBkNGYjjH8lcg.GvcRyY-zeL1CP-rRXH45utDxpPndugj1yRuwTUC2bFcg.JPEG/AA1SY6tW.jpg?type=w800"

def verify_public():
    print(f"Testing public access to proxy for: {target_url}")
    # NO headers (no auth)
    r = requests.get(proxy_url, params={"url": target_url}, timeout=10)
    print(f"Status Code: {r.status_code}")
    if r.status_code == 200:
        print("SUCCESS: Proxy is now public and accessible for images.")
    else:
        print(f"FAILURE: Proxy returned {r.status_code}")
        print(r.text)

if __name__ == "__main__":
    verify_public()
