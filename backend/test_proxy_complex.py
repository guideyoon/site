import requests

base_url = "http://localhost:8001"
proxy_url = f"{base_url}/api/items/download-proxy"
# A complex URL found in the database
target_url = "https://dthumb-phinf.pstatic.net/?src=%22https%3A%2F%2Fblogthumb.pstatic.net%2FMjAyNTEyMTNfOTQg%2FMDAxNzY1NjI3ODczNjc5.-jERiQMHR34I9SmVjRCGNGF_oax_kvmhm5mt-e2jTkkg.VPvHw1WNU2s8KsSIRmE45LbyX5a32qjYB7IZNiOoG4sg.PNG%2Fimage.png%3Ftype%3Dw2%22&type=ff500_300"

def test_complex():
    print(f"Testing proxy for complex URL: {target_url}")
    r = requests.get(proxy_url, params={"url": target_url, "referer": "https://m.blog.naver.com/"}, timeout=10)
    print(f"Status: {r.status_code}")
    if r.status_code != 200:
        print(f"Error Body: {r.text[:200]}")
    else:
        print("Complex URL Proxy SUCCESS")

if __name__ == "__main__":
    test_complex()
