@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>&1
if errorlevel 1 (
  echo Install Node.js 20.9 or newer from https://nodejs.org/ first.
  pause
  exit /b 1
)
node -e "const [a,b]=process.versions.node.split('.').map(Number);process.exit(a<20||(a===20&&b<9)?1:0)"
if errorlevel 1 (
  echo This project needs Node.js 20.9 or newer.
  pause
  exit /b 1
)
if not exist .env.local copy .env.example .env.local >nul
if not exist node_modules (
  call npm ci --no-audit --no-fund
  if errorlevel 1 (
    pause
    exit /b 1
  )
)
echo.
echo Open http://127.0.0.1:3000 after Next.js starts.
echo Edit .env.local to enter your CA and own team passcode.
echo Keep this window open. Press Ctrl+C to stop.
echo.
call npm run dev
if errorlevel 1 pause
