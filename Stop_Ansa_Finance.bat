@echo off
title Stop Ansa Finance
echo =======================================================
echo          MENGHENTIKAN SERVER ANSA FINANCE...
echo =======================================================
echo.

echo 1. Menghentikan Backend (Port 8000)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8000') do (
    taskkill /F /PID %%a >nul 2>nul
)

echo 2. Menghentikan Frontend (Port 5173)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5173') do (
    taskkill /F /PID %%a >nul 2>nul
)

echo.
echo =======================================================
echo     Semua server Ansa Finance berhasil dihentikan!
echo =======================================================
echo.
pause
