import redis
import os

def test_redis():
    # Try localhost first
    urls = [
        'redis://localhost:6379/0',
        'redis://127.0.0.1:6379/0',
    ]
    
    for url in urls:
        print(f"Testing {url}...")
        try:
            r = redis.from_url(url, socket_timeout=2)
            print(f"  Ping: {r.ping()}")
        except Exception as e:
            print(f"  Error: {e}")

if __name__ == "__main__":
    test_redis()
