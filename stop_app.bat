@echo off
echo ==========================================
echo   AI Interview Coach - Stopping All Services
echo ==========================================

echo Stopping Node.js processes (Backend and Vite)...
taskkill /F /IM node.exe /T 2>nul

echo Stopping Python processes (Flask Service)...
taskkill /F /IM python.exe /T 2>nul

echo.
echo ------------------------------------------
echo All services have been stopped!
echo ------------------------------------------
pause
