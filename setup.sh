#!/bin/bash

echo "🛠️  AI Image Editor Setup"
echo "=========================="
echo ""

# Check if .env file exists
if [ -f ".env" ]; then
    echo "✅ .env file already exists"
    echo "Current configuration:"
    cat .env | grep -v "^#" | grep "="
    echo ""
    read -p "Do you want to update it? (y/N): " update_env
    if [[ $update_env != "y" && $update_env != "Y" ]]; then
        echo "Skipping .env configuration"
        echo ""
    else
        rm .env
    fi
fi

# Create .env file if it doesn't exist or user wants to update
if [ ! -f ".env" ]; then
    echo "📝 Setting up environment variables..."
    echo ""
    
    # Get Replicate API key
    echo "You need a Replicate API key to use this application."
    echo "Get one from: https://replicate.com/account/api-tokens"
    echo ""
    read -p "Enter your Replicate API key: " replicate_key
    
    if [ -z "$replicate_key" ]; then
        echo "⚠️  Warning: No API key provided. You can add it later to .env file"
        replicate_key="your_replicate_api_key_here"
    fi
    
    # Create .env file
    cat > .env << EOF
# Replicate API Configuration
REPLICATE_API_KEY=$replicate_key

# Backend Configuration
FLASK_ENV=development
FLASK_DEBUG=true

# Frontend Configuration
REACT_APP_API_URL=http://localhost:5000
EOF
    
    echo "✅ Created .env file"
    echo ""
fi

# Check Python
echo "🐍 Checking Python installation..."
if command -v python3 &> /dev/null; then
    python_version=$(python3 --version 2>&1)
    echo "✅ Found: $python_version"
else
    echo "❌ Python 3 not found. Please install Python 3.8 or higher"
    echo "Download from: https://www.python.org/downloads/"
    exit 1
fi

# Check Node.js
echo "📦 Checking Node.js installation..."
if command -v node &> /dev/null; then
    node_version=$(node --version 2>&1)
    echo "✅ Found: Node.js $node_version"
else
    echo "❌ Node.js not found. Please install Node.js 16 or higher"
    echo "Download from: https://nodejs.org/"
    exit 1
fi

# Check npm
if command -v npm &> /dev/null; then
    npm_version=$(npm --version 2>&1)
    echo "✅ Found: npm $npm_version"
else
    echo "❌ npm not found. Please install npm"
    exit 1
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Run ./start.sh (Linux/Mac) or start.bat (Windows)"
echo "2. Open http://localhost:3000 in your browser"
echo ""
echo "If you need to add your Replicate API key later:"
echo "Edit the .env file and replace 'your_replicate_api_key_here' with your actual key" 