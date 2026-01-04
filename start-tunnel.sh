#!/bin/bash
#
# MBTI Assistant - Cloudflared Tunnel Startup Script
#
# This script creates public URLs for both frontend and backend services
# using Cloudflare's free quick tunnels (no account required).
#
# Usage:
#   1. Make sure both frontend and backend are running locally first
#   2. Run this script: ./start-tunnel.sh
#   3. Share the generated URLs with others
#
# Note: The URLs are temporary and change each time you restart the tunnels.

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Ports
FRONTEND_PORT=3000
BACKEND_PORT=8000

echo -e "${PURPLE}"
echo "╔════════════════════════════════════════════════════════════╗"
echo "║           MBTI Assistant - Cloudflared Tunnels             ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Check if cloudflared is installed
if ! command -v cloudflared &> /dev/null; then
    echo -e "${RED}Error: cloudflared is not installed${NC}"
    echo "Install it with: brew install cloudflared"
    exit 1
fi

# Check if services are running
echo -e "${YELLOW}Checking if services are running...${NC}"

if ! lsof -i :$FRONTEND_PORT > /dev/null 2>&1; then
    echo -e "${RED}Error: Frontend is not running on port $FRONTEND_PORT${NC}"
    echo "Start it with: cd frontend && npm run dev"
    exit 1
fi
echo -e "${GREEN}✓ Frontend is running on port $FRONTEND_PORT${NC}"

if ! lsof -i :$BACKEND_PORT > /dev/null 2>&1; then
    echo -e "${RED}Error: Backend is not running on port $BACKEND_PORT${NC}"
    echo "Start it with: cd backend && source venv/bin/activate && uvicorn app.main:app --reload --port 8000"
    exit 1
fi
echo -e "${GREEN}✓ Backend is running on port $BACKEND_PORT${NC}"

echo ""
echo -e "${BLUE}Starting Cloudflare tunnels...${NC}"
echo -e "${YELLOW}This may take a few seconds...${NC}"
echo ""

# Create temp files to capture URLs
BACKEND_URL_FILE=$(mktemp)
FRONTEND_URL_FILE=$(mktemp)

# Cleanup function
cleanup() {
    echo ""
    echo -e "${YELLOW}Shutting down tunnels...${NC}"
    kill $BACKEND_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
    rm -f $BACKEND_URL_FILE $FRONTEND_URL_FILE
    echo -e "${GREEN}Tunnels closed. Goodbye!${NC}"
}
trap cleanup EXIT

# Start backend tunnel
echo -e "${BLUE}[1/2] Starting backend tunnel (port $BACKEND_PORT)...${NC}"
cloudflared tunnel --url http://localhost:$BACKEND_PORT --no-tls-verify 2>&1 | tee $BACKEND_URL_FILE &
BACKEND_PID=$!

# Wait for backend URL
sleep 5

# Start frontend tunnel
echo -e "${BLUE}[2/2] Starting frontend tunnel (port $FRONTEND_PORT)...${NC}"
cloudflared tunnel --url http://localhost:$FRONTEND_PORT --no-tls-verify 2>&1 | tee $FRONTEND_URL_FILE &
FRONTEND_PID=$!

# Wait for frontend URL
sleep 5

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                    Tunnels are ready!                      ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}Check the output above to find your public URLs.${NC}"
echo -e "${YELLOW}Look for lines containing 'trycloudflare.com'${NC}"
echo ""
echo -e "${PURPLE}Important:${NC}"
echo -e "1. Update your frontend .env.local with the BACKEND URL:"
echo -e "   ${BLUE}NEXT_PUBLIC_API_URL=https://xxx-xxx.trycloudflare.com${NC}"
echo ""
echo -e "2. Then restart your frontend and share the FRONTEND URL with others!"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop all tunnels${NC}"

# Keep script running
wait

