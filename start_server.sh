#!/usr/bin/env bash

# ==============================================================================
# QuoteCraft Pro - Local Server Launcher (macOS / Linux)
# ==============================================================================

cd "$(dirname "$0")" || exit 1

PORT=8899
SERVER_URL="http://localhost:${PORT}"

echo "============================================================"
echo "⚡ Starting QuoteCraft Pro Local Server..."
echo "============================================================"

# Check if Python 3 is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Error: python3 is not installed or not in PATH."
    echo "Please install Python 3 from https://www.python.org/downloads/"
    exit 1
fi

# Open default browser after a brief pause
(sleep 1.5 && (open "$SERVER_URL" 2>/dev/null || xdg-open "$SERVER_URL" 2>/dev/null || echo "🌐 Open $SERVER_URL in your browser")) &

# Start the Python server
python3 server.py
