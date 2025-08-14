#!/bin/bash

# AI Image Editor Startup Script
echo "🚀 Starting AI Image Editor..."

# Function to check if port is in use
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Kill any existing processes on our ports
echo "🧹 Cleaning up existing processes..."
if check_port 5001; then
    echo "Stopping process on port 5001..."
    pkill -f "python.*app.py" 2>/dev/null || true
fi

if check_port 3000; then
    echo "Stopping process on port 3000..."
    pkill -f "react-scripts" 2>/dev/null || true
    pkill -f "node" 2>/dev/null || true
fi

sleep 2

# Start backend (no installs)
echo "🐍 Starting Flask backend..."
cd backend

# Activate virtual environment if present
if [ -d "venv" ]; then
    # shellcheck disable=SC1091
    source venv/bin/activate
fi

# Start Flask server in background
echo "Starting Flask server on http://localhost:5001"
python app.py &
BACKEND_PID=$!

# Wait for backend to start
echo "Waiting for backend to start..."
sleep 5

# Check if backend started successfully
if ! check_port 5001; then
    echo "❌ Failed to start backend server"
    exit 1
fi

echo "✅ Backend started successfully"

# Start frontend (no installs)
echo "⚛️  Starting React frontend..."
cd ../frontend

# Start React development server with OpenSSL legacy provider
echo "Starting React server on http://localhost:3000"
export NODE_OPTIONS=--openssl-legacy-provider
PORT=3000 npm start &
FRONTEND_PID=$!

# Wait for frontend to start
echo "Waiting for frontend to start..."
sleep 10

# Check if frontend started successfully
if ! check_port 3000; then
    echo "❌ Failed to start frontend server"
    kill $BACKEND_PID 2>/dev/null
    exit 1
fi

echo "✅ Frontend started successfully"
echo ""
echo "🎉 AI Image Editor is now running!"
echo "Frontend: http://localhost:3000"
echo "Backend:  http://localhost:5001"
echo ""
echo "Opening frontend in your default browser..."
if command -v open >/dev/null 2>&1; then
    open http://localhost:3000
elif command -v xdg-open >/dev/null 2>&1; then
    xdg-open http://localhost:3000 >/dev/null 2>&1 &
fi
echo "Press Ctrl+C to stop both servers"

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Shutting down servers..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    echo "👋 Servers stopped"
    exit 0
}

# Set trap to cleanup on script exit
trap cleanup INT TERM

# Wait for both processes
wait 