# Ulsan Content Collection Platform (울산인 수집 대기소)

울산 관련 정보를 여러 출처에서 수집하고, 중복 제거, 분류, 요약 후 네이버 카페 게시용으로 준비하는 플랫폼입니다.

## 주요 기능

- 🔄 자동 콘텐츠 수집 (기관 사이트, RSS)
- 🎯 자동 분류 및 태그 생성
- 📝 AI 기반 요약 (선택 사항)
- ✅ 검수 및 승인 워크플로
- 📋 네이버 카페 게시용 템플릿 생성
- 🚫 중복 탐지

## 기술 스택

- **Backend**: FastAPI (Python 3.11)
- **Task Queue**: Celery + Redis
- **Database**: PostgreSQL 15
- **Frontend**: Next.js 14
- **Containerization**: Docker Compose

## 환경 설정

1. 환경 변수 파일 생성:
```bash
cp .env.example .env
```

2. `.env` 파일 수정:
- `DATABASE_URL`: PostgreSQL 연결 정보
- `REDIS_URL`: Redis 연결 정보
- `SECRET_KEY`: JWT 시크릿 키 (랜덤 문자열로 변경)
- `OPENAI_API_KEY`: OpenAI API 키 (선택 사항)

## 실행 방법

### Docker Compose로 실행 (권장)

```bash
cd infra
docker-compose up -d
```

서비스 확인:
- Backend API: http://localhost:8000
- API 문서: http://localhost:8000/docs
- Frontend: http://localhost:3000

### 로컬 개발 환경

Backend:
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Celery Worker:
```bash
cd backend
celery -A worker.celery_app worker --loglevel=info
```

Celery Beat:
```bash
cd backend
celery -A worker.celery_app beat --loglevel=info
```

Frontend:
```bash
cd frontend
npm install
npm run dev
```

## 초기 설정

### 1. 관리자 계정 생성

```bash
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "your-password", "role": "admin"}'
```

### 2. 출처(Source) 추가

관리자로 로그인 후 Sources 페이지에서 출처를 추가하거나 API로 직접 추가:

```bash
curl -X POST http://localhost:8000/api/sources \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "울산시청 공지사항",
    "type": "generic_board",
    "base_url": "https://www.ulsan.go.kr",
    "crawl_policy": "{\"list_url\": \"https://www.ulsan.go.kr/rep/notice/list\", \"selectors\": {\"row\": \"tr\", \"title\": \"a\", \"date\": \".date\"}}"
  }'
```

## 데이터 수집 주기

기본값: 60분마다 자동 수집
환경 변수 `COLLECT_INTERVAL_MINUTES`로 변경 가능

수동 수집 트리거:
```bash
curl -X POST http://localhost:8000/api/sources/{source_id}/collect \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 워크플로

1. **수집** - Celery worker가 주기적으로 출처에서 새 글 수집
2. **처리** - 중복 제거, 분류, 요약 자동 생성
3. **대기열** - 수집된 항목이 검수 대기열에 적재
4. **승인** - 관리자/에디터가 내용 확인 및 수정 후 승인
5. **내보내기** - 네이버 카페용 포맷 생성
6. **게시** - 수동으로 카페에 복사 붙여넣기

## 법적 준수 사항

- ⚠️ **robots.txt 준수**: 각 출처 사이트의 robots.txt 확인 필수
- ⚠️ **이용약관 준수**: 수집 전 사이트 이용약관 확인
- ⚠️ **저작권**: 원문 전체 복제 금지, 요약 + 링크 중심
- ⚠️ **자동 게시 금지**: 네이버 카페 자동 게시 기본 비활성화

## 사용자 역할

- **admin**: 모든 권한 (출처 관리, 사용자 관리)
- **editor**: 검수 및 승인
- **viewer**: 읽기 전용

## 문제 해결

### 컨테이너 로그 확인
```bash
cd infra
docker-compose logs -f backend
docker-compose logs -f worker
```

### 데이터베이스 초기화
```bash
docker-compose down -v
docker-compose up -d
```

### Celery 작업 큐 확인
```bash
docker-compose exec redis redis-cli LLEN celery
```

## 라이선스

이 프로젝트는 울산 지역 정보 공유를 위한 내부 도구입니다.

---

**주의**: 자동 수집 전 반드시 해당 사이트의 이용약관과 robots.txt를 확인하세요.
