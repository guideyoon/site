# Docker Desktop 설치 및 실행 가이드

## 1단계: Docker Desktop 설치

### 다운로드
1. 브라우저에서 Docker Desktop 다운로드 페이지가 열렸습니다
2. "Download for Windows" 버튼 클릭
3. 다운로드된 Docker Desktop Installer.exe 실행

### 설치 과정
1. "Use WSL 2 instead of Hyper-V" 옵션 체크 (권장)
2. "Install" 버튼 클릭
3. 설치 완료 후 컴퓨터 재시작 (필요시)

### Docker Desktop 시작
1. Docker Desktop 애플리케이션 실행
2. 상단 상태가 "Docker Desktop is running" 으로 표시될 때까지 대기
3. (선택) Docker 계정 로그인 건너뛰기 가능

## 2단계: 플랫폼 실행

Docker Desktop이 실행 중인 상태에서:

### PowerShell에서 실행

```powershell
# 프로젝트 디렉토리로 이동
cd c:\Users\user\navercafe\infra

# Docker Compose로 모든 서비스 시작
docker-compose up -d

# 서비스 상태 확인
docker-compose ps
```

### 예상 출력
```
NAME                    STATUS
navercafe_postgres      Up
navercafe_redis         Up
navercafe_backend       Up
navercafe_worker        Up
navercafe_beat          Up
navercafe_frontend      Up
```

## 3단계: 관리자 계정 생성

```powershell
# Backend 컨테이너에서 관리자 생성
docker-compose exec backend python scripts/create_admin.py --username admin --password admin123
```

## 4단계: 접속

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API 문서**: http://localhost:8000/docs

## 로그인 정보
- 아이디: admin
- 비밀번호: admin123

## 서비스 관리

### 로그 확인
```powershell
# 모든 서비스 로그
docker-compose logs -f

# 특정 서비스 로그
docker-compose logs -f backend
docker-compose logs -f worker
docker-compose logs -f frontend
```

### 서비스 중지
```powershell
docker-compose down
```

### 서비스 재시작
```powershell
docker-compose restart
```

### 전체 재설치 (데이터베이스 포함)
```powershell
docker-compose down -v
docker-compose up -d
```

## 문제 해결

### Port already in use
다른 프로그램이 포트를 사용 중인 경우:
```powershell
# 포트 사용 중인 프로세스 확인
netstat -ano | findstr :8000
netstat -ano | findstr :3000

# 해당 프로세스 종료 후 재시작
docker-compose down
docker-compose up -d
```

### Docker Desktop이 시작되지 않는 경우
1. Windows 업데이트 확인
2. WSL 2 활성화 확인
3. Docker Desktop 재설치

### 컨테이너가 시작되지 않는 경우
```powershell
# 로그 확인
docker-compose logs backend

# 개별 서비스 재시작
docker-compose restart backend
```

## 다음 단계

설치 완료 후:
1. http://localhost:3000 접속
2. admin/admin123으로 로그인
3. "출처 관리"에서 출처 추가
4. 수집 시작!
