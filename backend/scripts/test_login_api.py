import requests

url = "http://localhost:8000/api/auth/login"
data = {
    "username": "admin",
    "password": "admin123"
}

print(f"로그인 테스트: {url}")
print(f"데이터: {data}")

try:
    response = requests.post(url, data=data)
    print(f"\n상태 코드: {response.status_code}")
    print(f"응답: {response.text}")
    
    if response.status_code == 200:
        print("\n✓ 로그인 성공!")
        json_data = response.json()
        print(f"토큰: {json_data.get('access_token', 'N/A')[:50]}...")
    else:
        print("\n✗ 로그인 실패")
        
except Exception as e:
    print(f"\n오류: {e}")
