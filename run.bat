@echo off
cd /d "%~dp0"

for /f "usebackq delims=" %%i in (`powershell -NoProfile -Command "(Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike '169.254.*' -and $_.InterfaceAlias -notmatch 'Loopback|vEthernet|Virtual' } | Select-Object -First 1 -ExpandProperty IPAddress)"`) do set "LAN_IP=%%i"

if "%LAN_IP%"=="" (
    echo Could not detect a LAN IP, falling back to localhost only.
    set "LAN_IP=localhost"
)

echo Detected LAN IP: %LAN_IP%

start "drawdb-clone backend" cmd /k "cd backend && venv\Scripts\activate && set "CORS_ORIGINS=http://localhost:5173,http://%LAN_IP%:5173" && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"
start "drawdb-clone frontend" cmd /k "cd frontend && set "VITE_API_URL=http://%LAN_IP%:8000" && npm run dev"

echo.
echo Local:   http://localhost:5173
echo Network: http://%LAN_IP%:5173
