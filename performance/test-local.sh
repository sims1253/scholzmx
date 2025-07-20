#!/bin/bash

# Local Performance Testing Script
# Requirements: 2.1, 2.5

echo "🚀 Starting local performance testing..."

# Check if Quarto is available
if ! command -v quarto &> /dev/null; then
    echo "❌ Quarto is not installed. Please install Quarto first."
    exit 1
fi

# Check if LHCI is available
if ! command -v lhci &> /dev/null; then
    echo "📦 Installing Lighthouse CI..."
    npm install -g @lhci/cli
fi

# Build the site
echo "🔨 Building site with Quarto..."
quarto render

# Start local server
echo "🌐 Starting local server..."
npx http-server docs -p 3000 &
SERVER_PID=$!

# Wait for server to start
sleep 5

# Run Lighthouse CI
echo "🔍 Running Lighthouse audit..."
lhci autorun

# Stop server
kill $SERVER_PID

echo "✅ Local performance testing complete!"
echo "📊 Results saved in .lighthouseci/ directory"