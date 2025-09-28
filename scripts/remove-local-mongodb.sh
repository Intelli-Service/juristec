#!/bin/bash

# 🚀 Juristec Platform - MongoDB Local Removal Script
# Remove MongoDB local installation to avoid conflicts with Docker tests
# Author: Auri (AI Developer)
# Date: September 27, 2025

echo "🗑️  Juristec Platform - MongoDB Local Removal"
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${YELLOW}⚠️  This will remove MongoDB from your local machine${NC}"
echo "This is recommended to avoid conflicts with Docker test environment"
echo ""

# Check if running on macOS with Homebrew
if [[ "$OSTYPE" == "darwin"* ]] && command -v brew >/dev/null 2>&1; then
    echo -e "${BLUE}🍺 Detected macOS with Homebrew${NC}"

    # Check if MongoDB is installed via Homebrew
    if brew list | grep -q mongodb-community; then
        echo -e "${YELLOW}📦 MongoDB found via Homebrew. Stopping service...${NC}"
        brew services stop mongodb-community 2>/dev/null || true

        echo -e "${RED}🗑️  Uninstalling MongoDB...${NC}"
        brew uninstall mongodb-community

        echo -e "${GREEN}✅ MongoDB uninstalled successfully${NC}"
    else
        echo -e "${GREEN}✅ MongoDB not found via Homebrew${NC}"
    fi

    # Check if MongoDB is still running
    if pgrep -f mongod >/dev/null 2>&1; then
        echo -e "${YELLOW}⚠️  MongoDB process still running. Killing...${NC}"
        pkill -f mongod
        sleep 2
        echo -e "${GREEN}✅ MongoDB process killed${NC}"
    fi

else
    echo -e "${YELLOW}⚠️  This script is designed for macOS with Homebrew${NC}"
    echo "Please manually uninstall MongoDB from your system"
    echo ""
    echo "For other systems:"
    echo "- Ubuntu/Debian: sudo apt remove mongodb"
    echo "- CentOS/RHEL: sudo yum remove mongodb"
    echo "- Windows: Use Add/Remove Programs"
    exit 1
fi

echo ""
echo -e "${GREEN}🎉 MongoDB local removal completed!${NC}"
echo ""
echo -e "${BLUE}📋 Next steps:${NC}"
echo "1. Run tests with: ./scripts/test-all.sh"
echo "2. All database operations will use Docker containers"
echo "3. No more port conflicts between local and test MongoDB"
echo ""
echo -e "${BLUE}🔄 To reinstall MongoDB locally later:${NC}"
echo "brew install mongodb-community"
echo "brew services start mongodb-community"