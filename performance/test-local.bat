@echo off
REM Local Performance Testing Script for Windows
REM Requirements: 2.1, 2.5

echo 🚀 Starting local performance testing...

REM Check if Quarto is available
where quarto >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Quarto is not installed. Please install Quarto first.
    exit /b 1
)

REM Check if LHCI is available
where lhci >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo 📦 Installing Lighthouse CI...
    npm install -g @lhci/cli
)

REM Build the site
echo 🔨 Building site with Quarto...
quarto render

REM Start local server
echo 🌐 Starting local server...
start /B npx http-server docs -p 3000

REM Wait for server to start
timeout /t 5 /nobreak >nul

REM Run Lighthouse CI
echo 🔍 Running Lighthouse audit...
lhci autorun

REM Stop server (kill all http-server processes)
taskkill /f /im node.exe >nul 2>nul

echo ✅ Local performance testing complete!
echo 📊 Results saved in .lighthouseci/ directory