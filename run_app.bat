@echo off
echo ==========================================
echo   AI Interview Coach - Starting All Services
echo ==========================================

:: 1. Start Node.js Backend
echo [1/3] Starting Backend (Port 5000)...
start "AI-Coach-Backend" cmd /k "cd /d %~dp0backend && node server.js"

:: 2. Start Python Flask Service
echo [2/3] Starting Python Service (Port 5001)...
start "AI-Coach-Python" cmd /k "cd /d %~dp0python-service && venv\Scripts\python.exe app.py"

:: 3. Start Vite Frontend
echo [3/3] Starting Frontend (Port 5173)...
start "AI-Coach-Frontend" cmd /k "cd /d %~dp0frontend && npx vite"

echo.
echo ------------------------------------------
echo All services are launching in separate windows!
echo - Frontend: http://localhost:5173
echo - Backend:  http://localhost:5000
echo - Python:   http://localhost:5001
echo ------------------------------------------
pause
