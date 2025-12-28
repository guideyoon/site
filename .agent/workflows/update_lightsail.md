---
description: 어떻게 프로그램을 수정하고 업데이트하는지 설명합니다.
---

# 라이트세일 서버 업데이트 가이드

프로그램의 기능을 수정하거나 UI를 변경한 후 서버에 반영하는 표준 절차입니다.

## 1. 코드 수정 및 서버 반영 준비
로컬 PC에서 코드를 수정하신 후, 서버로 코드를 보낼 가장 좋은 방법은 **GitHub(Git)**를 사용하는 것입니다.

1. **로컬 PC**: 코드 수정 후 저장
2. **로컬 PC**: Git Push 실행
   ```bash
   git add .
   git commit -m "수정 내용 설명"
   git push origin main
   ```

## 2. 서버에서 코드 가져오기
라이트세일 터미널(SSH)에 접속하여 최신 코드를 내려받습니다.

```bash
cd ~/site
git pull origin main
```

## 3. 서버 업데이트 실행 (Docker)
코드가 바뀌었으므로 도커 이미지를 새로 빌드하고 서비스를 재시작해야 합니다.

> [!TIP]
> 1GB RAM 서버이므로 안전을 위해 **프론트엔드를 먼저 끄고 빌드**하는 것이 좋습니다.

```bash
cd ~/site/infra

# 1. 기존 프론트엔드 중지 (메모리 확보)
sudo docker-compose stop frontend

# 2. 변경된 코드 반영 및 재빌드 (백엔드/프론트엔드 통합)
sudo docker-compose up -d --build

# 3. (혹시 빌드 중 오류가 났었다면) 찌꺼기 정리 후 재시작
sudo docker system prune -f
sudo docker-compose up -d
```

## 4. 주의사항 및 팁

### 브라우저 캐시
프론트엔드(UI)를 수정했는데 서버 반영 후에도 예전 화면이 보인다면, 브라우저에서 **Ctrl + Shift + R** (강력 새로고침)을 눌러주세요.

### API 주소 관리
현재 코드는 접속하는 주소를 자동으로 감지하도록 수정되어 있습니다. 따라서 별도의 환경 변수(`NEXT_PUBLIC_API_URL`) 수정 없이도 IP가 바뀌거나 도메인을 연결했을 때 자동으로 대응합니다.

### 로그 확인
업데이트 후 서비스가 잘 돌아가는지 확인하려면 아래 명령어를 사용하세요.
```bash
sudo docker-compose logs -f --tail 50
```
