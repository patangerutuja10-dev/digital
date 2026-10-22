@echo off
cd /d "%~dp0"
docker compose up -d postgres
if errorlevel 1 pause
pause
