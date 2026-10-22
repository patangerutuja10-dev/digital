@echo off
cd /d "%~dp0apps\ai"
python -m pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000
pause
