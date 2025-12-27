# 울산인 수집 대기소 - 로컬 실행 가이드

Docker가 설치되어 있지 않은 환경에서 실행하는 방법입니다.

## 사전 요구사항

### 1. Python 3.11 이상 설치
- https://www.python.org/downloads/

### 2. Node.js 20 이상 설치
- https://nodejs.org/

### 3. PostgreSQL 설치 (선택)
- https://www.postgresql.org/download/
- 또는 SQLite로 임시 테스트 가능

### 4. Redis 설치 (선택)
- Windows용: https://github.com/microsoftarchive/redis/releases
- 또는 워커 없이 API만 실행 가능

## 빠른 시작 (API만 실행)

### 1. Backend 설치 및 실행

```powershell
# Backend 디렉토리로 이동
cd c:\Users\user\navercafe\backend

# 가상환경 생성
python -m venv venv

# 가상환경 활성화
.\venv\Scripts\Activate.ps1

# 의존성 설치
pip install -r requirements.txt

# 환경변수 설정 (SQLite 사용)
$env:DATABASE_URL="sqlite:///./navercafe.db"
$env:SECRET_KEY="dev-secret-key"

# 앱 실행
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Backend API가 http://localhost:8000 에서 실행됩니다.
API 문서: http://localhost:8000/docs

### 2. Frontend 설치 및 실행

새 터미널을 열고:

```powershell
# Frontend 디렉토리로 이동
cd c:\Users\user\navercafe\frontend

# 의존성 설치
npm install

# 개발 서버 실행
npm run dev
```

Frontend가 http://localhost:3000 에서 실행됩니다.

### 3. 관리자 계정 생성

Backend가 실행 중인 상태에서 새 터미널을 열고:

```powershell
cd c:\Users\user\navercafe\backend
.\venv\Scripts\Activate.ps1

# SQLite용 환경변수 설정
$env:DATABASE_URL="sqlite:///./navercafe.db"

# 관리자 생성
python scripts/create_admin.py --username admin --password admin123
```

## 접속

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API 문서: http://localhost:8000/docs

## 로그인

- 아이디: admin
- 비밀번호: admin123

## 주의사항

### Worker 없이 실행
현재 설정은 API만 실행되며, 자동 수집 기능(Celery Worker)은 동작하지 않습니다.
- ✅ 수동 수집은 가능
- ✅ 모든 관리 기능은 정상 작동
- ❌ 자동 주기적 수집은 불가 (Redis/Celery 필요)

### PostgreSQL/Redis 설치 시
PostgreSQL과 Redis를 설치한 경우:

1. PostgreSQL 데이터베이스 생성:
```sql
CREATE DATABASE navercafe;
CREATE USER navercafe WITH PASSWORD 'navercafe123';
GRANT ALL PRIVILEGES ON DATABASE navercafe TO navercafe;
```

2. .env 파일의 DATABASE_URL 수정:
```
DATABASE_URL=postgresql://navercafe:navercafe123@localhost:5432/navercafe
```

3. Worker 실행 (새 터미널):
```powershell
cd c:\Users\user\navercafe\backend
.\venv\Scripts\Activate.ps1
celery -A worker.celery_app worker --loglevel=info
```

4. Beat 실행 (새 터미널):
```powershell
cd c:\Users\user\navercafe\backend
.\venv\Scripts\Activate.ps1
celery -A worker.celery_app beat --loglevel=info
```

## Docker 설치 시

Docker Desktop을 설치하면 전체 스택을 쉽게 실행할 수 있습니다:
- Docker Desktop for Windows: https://www.docker.com/products/docker-desktop/

설치 후:
```powershell
cd c:\Users\user\navercafe\infra
docker-compose up -d
```

## 문제 해결

### Port already in use
다른 프로그램이 포트를 사용 중인 경우:
- Backend: `--port 8001`로 변경
- Frontend: package.json에서 포트 변경

### SQLite 권한 에러
Backend 디렉토리에 쓰기 권한이 있는지 확인

### Module not found
가상환경이 활성화되었는지 확인: `.\venv\Scripts\Activate.ps1`
