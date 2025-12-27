@echo off
chcp 65001 >nul
setlocal
title 울산인 수집 대기소 통합 실행기

:: 프로젝트 절대 경로 설정
set PROJECT_ROOT=c:\Users\user\navercafe

echo ==========================================
echo   울산인 수집 대기소 시스템을 시작합니다
echo ==========================================
echo.

cd /d "%PROJECT_ROOT%"

:: 1. 인프라 (Docker) 실행
echo [1/3] 인프라 서비스를 시작합니다 (Postgres, Redis, Worker, Beat)...
docker-compose -f infra/docker-compose.yml up -d
if %ERRORLEVEL% NEQ 0 (
    echo [!ERROR!] Docker 실행에 실패했습니다. Docker Desktop이 켜져 있는지 확인해주세요.
    pause
    exit /b
)
echo 인프라 서비스 실행 완료.
echo.

:: 2. 백엔드 서버 실행 (새 창)
echo [2/3] 백엔드 API 서버를 시작합니다 (Port 8001)...
start "NaverCafe Backend" cmd /k "cd /d %PROJECT_ROOT%\backend && uvicorn app.main:app --reload --port 8001"

:: 3. 프론트엔드 서버 실행 (새 창)
echo [3/3] 프론트엔드 웹 서버를 시작합니다 (Port 3002)...
start "NaverCafe Frontend" cmd /k "cd /d %PROJECT_ROOT%\frontend && npm run dev -- -p 3002"

:: 4. 브라우저 자동 실행
echo [완료] 브라우저에서 웹 사이트를 엽니다...
timeout /t 5 >nul
start "" "http://localhost:3002"

echo.
echo ==========================================
echo   모든 서비스가 시작되었습니다!
echo.
echo   - 백엔드: http://localhost:8000
echo   - 프론트: http://localhost:3002
echo   - 관리자: http://localhost:8000/docs
echo ==========================================
echo.
echo 이 파일을 바탕화면으로 옮겨서 사용하셔도 됩니다.
echo.
pause
