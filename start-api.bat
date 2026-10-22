@echo off
cd /d "%~dp0apps\api"
if not exist .env copy .env.example .env
call npm install
call npx prisma generate
call npx prisma db push
call npm run seed
call npm run dev
pause
