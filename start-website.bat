@echo off
cd /d "%~dp0apps\web"
if not exist .env copy .env.example .env
call npm install
call npm run dev
pause
