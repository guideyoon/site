@echo off
echo ========================================================
echo Checking Server Status and Collection Logs
echo ========================================================

echo.
echo 1. Checking Docker Containers...
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo.
echo 2. Recent Backend Logs (API Status)...
cd infra
docker-compose logs --tail=20 backend

echo.
echo 3. Recent Worker Logs (Collection Tasks)...
echo --------------------------------------------------------
docker-compose logs --tail=50 worker
echo --------------------------------------------------------

echo.
echo 4. Recent Scheduler Logs (Beat)...
docker-compose logs --tail=20 beat

echo.
echo ========================================================
echo If you see 'Connection refused' or 'Error' in Worker logs,
echo please report it.
echo ========================================================
pause
