#!/bin/bash

echo "🛠️  AI Image Editor Setup"
echo "=========================="
echo ""

# Create or update .env minimally (non-interactive)
if [ ! -f ".env" ]; then
    echo "Creating default .env file..."
    cat > .env << EOF
# Replicate API Configuration
REPLICATE_API_KEY=your_replicate_api_key_here

# Backend Configuration
FLASK_ENV=development
FLASK_DEBUG=true
FLASK_HOST=0.0.0.0
FLASK_PORT=5001

# Frontend Configuration
REACT_APP_API_URL=http://localhost:5001
EOF
    echo "✅ Created .env (update REPLICATE_API_KEY later)"
else
    echo "✅ Using existing .env"
fi

# Check required tooling
echo "🐍 Checking Python installation..."
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 not found. Please install Python 3.8 or higher"
    exit 1
fi
python3 --version

echo "📦 Checking Node.js installation..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js 16 or higher"
    exit 1
fi
node --version

if ! command -v npm &> /dev/null; then
    echo "❌ npm not found. Please install npm"
    exit 1
fi
npm --version

# Install backend dependencies
echo "\n📁 Installing backend dependencies..."
cd backend || { echo "Backend directory not found"; exit 1; }
if [ ! -d "venv" ]; then
    python3 -m venv venv || { echo "Failed to create virtualenv"; exit 1; }
fi
# shellcheck disable=SC1091
source venv/bin/activate
python3 -m pip install --upgrade pip setuptools wheel
pip install -r requirements.txt || { echo "Failed to install backend dependencies"; exit 1; }
deactivate

# Install frontend dependencies
echo "\n📁 Installing frontend dependencies..."
cd ../frontend || { echo "Frontend directory not found"; exit 1; }
npm install || { echo "Failed to install frontend dependencies"; exit 1; }

echo "\n🎉 Setup complete!"
echo "Next: run ./start.sh to launch the app."