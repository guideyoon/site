import redis
import sys

try:
    r = redis.Redis(host='localhost', port=6379, db=0, socket_connect_timeout=2)
    r.ping()
    print("Redis is running")
except Exception as e:
    print(f"Redis connection failed: {e}")
