@echo off
title AI Image Editor

echo 🚀 Starting AI Image Editor...

REM Check if .env file exists
if not exist ".env" (
    echo ⚠️  Warning: .env file not found!
    echo Please create a .env file with your GROQ_API_KEY
    echo Example: echo GROQ_API_KEY=your_key_here > .env
    echo.
)

REM Kill any existing processes on our ports
echo 🧹 Cleaning up existing processes...
taskkill /f /im python.exe >nul 2>&1
taskkill /f /im node.exe >nul 2>&1

timeout /t 2 >nul

REM Start backend
echo 🐍 Starting Flask backend...
cd backend

REM Check if virtual environment exists
if not exist "venv" (
    echo Creating Python virtual environment...
    python -m venv venv
)

REM Activate virtual environment
call venv\Scripts\activate.bat

REM Install dependencies if needed
if not exist ".deps_installed" (
    echo Installing Python dependencies...
    pip install -r requirements.txt
    echo. > .deps_installed
)

REM Start Flask server
echo Starting Flask server on http://localhost:5000
start /b python app.py

REM Wait for backend to start
echo Waiting for backend to start...
timeout /t 5 >nul

echo ✅ Backend started

REM Start frontend
echo ⚛️ Starting React frontend...
cd ..\frontend

REM Install dependencies if needed
if not exist "node_modules" (
    echo Installing Node.js dependencies...
    npm install
)

REM Start React development server
echo Starting React server on http://localhost:3000
start /b npm start

REM Wait for frontend to start
echo Waiting for frontend to start...
timeout /t 10 >nul

echo ✅ Frontend started
echo.
echo 🎉 AI Image Editor is now running!
echo Frontend: http://localhost:3000
echo Backend:  http://localhost:5000
echo.
echo Press Ctrl+C to stop both servers
echo.

REM Keep the window open
pause 