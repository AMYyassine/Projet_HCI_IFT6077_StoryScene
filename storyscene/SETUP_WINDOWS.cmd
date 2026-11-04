@echo off
setlocal
cd /d "%~dp0"
echo Setting up Storyscene on this computer...
where node >nul 2>nul
if errorlevel 1 (
  echo Install Node.js 22.12+ or 24 LTS, then run this file again.
  pause
  exit /b 1
)
call npm.cmd ci
if errorlevel 1 goto failed
py -3 -m venv backend\.venv
if errorlevel 1 goto failed
backend\.venv\Scripts\python.exe -m pip install -r backend\requirements.lock.txt
if errorlevel 1 goto failed
if not exist backend\.env copy backend\.env.example backend\.env >nul
echo.
echo Setup complete. Add your key to backend\.env when ready.
echo Double-click START_WINDOWS.cmd to open the local studio.
pause
exit /b 0
:failed
echo.
echo Setup stopped. Read the error above and see README.md.
pause
exit /b 1
