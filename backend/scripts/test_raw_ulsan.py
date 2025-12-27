import requests

def test_raw_ulsan_download():
    # Resolved URL from one of the HHBbs snippets
    url = "https://www.ulsan.go.kr/u/enc/media/bbsFileDown.do?bbsId=BBS_0000000000000003&atchFileId=xjmfCOeZ0qhRd2vgYYpz+RNHpLsVPvyx3nnAsiKLEiA=&fileSn=JWyofO5U5CYzjCoHuM9qTA=="
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        "Referer": "https://www.ulsan.go.kr/u/rep/bbs/view.do?mId=001004001001000000&bbsId=BBS_0000000000000003&dataId=177740"
    }
    
    session = requests.Session()
    # Optional: hit the referer first to get cookies
    session.get(headers["Referer"], headers=headers)
    
    r = session.get(url, headers=headers)
    print(f"Status: {r.status_code}")
    print(f"Content: {r.text[:200]}")
    print(f"Length: {len(r.content)}")

if __name__ == "__main__":
    test_raw_ulsan_download()
