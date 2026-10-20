@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Please install Node.js 22 or later.
  pause
  exit /b 1
)
echo Open http://127.0.0.1:8787 in Chrome or Edge. Ctrl+C stops the server.
node serve.mjs %*
pause
