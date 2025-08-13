
# Start Flask server in background
echo "Starting Flask server on http://localhost:5000"
python app.py &
BACKEND_PID=$!

osascript -e "display notification \"Starting backend...\" with title \"Eraser\""

# Wait for backend to start
echo "Waiting for backend to start..."
sleep 5

# Check if backend started successfully
if ! check_port 5000; then
    echo "❌ Failed to start backend server"
    exit 1
fi

echo "✅ Backend started successfully"


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
echo "Backend:  http://localhost:5000"
echo ""
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