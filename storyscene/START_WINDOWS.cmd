@echo off
setlocal
cd /d "%~dp0"
echo Starting Storyscene. Open the local URL printed below.
echo Keep this window open. Press Ctrl+C to stop the app.
call npm.cmd run dev
pause
