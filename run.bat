@echo off
cd /d "%~dp0"

start "drawdb-clone backend" cmd /k "cd backend && venv\Scripts\activate && uvicorn app.main:app --reload --port 8000"
start "drawdb-clone frontend" cmd /k "cd frontend && npm run dev"
