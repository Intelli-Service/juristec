#!/bin/bash

# 🚀 Juristec Platform - Unified Test Runner
# Execute all tests in sequence: lint → jest → build → playwright E2E
# Author: Auri (AI Developer)
# Date: September 27, 2025

set -e  # Exit on any error

echo "🚀 Juristec Platform - Unified Test Runner"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

# Test results
PASSED=0
FAILED=0
TOTAL=0

# Function to run a test step
run_step() {
    local step_name=$1
    local command=$2
    local working_dir=${3:-"."}

    echo -e "\n${PURPLE}📋 $step_name${NC}"
    echo "----------------------------------------"

    ((TOTAL++))

    if cd "$working_dir" && eval "$command"; then
        echo -e "${GREEN}✅ $step_name - PASSED${NC}"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}❌ $step_name - FAILED${NC}"
        ((FAILED++))
        return 1
    fi
}

# Function to show final results
show_results() {
    echo -e "\n${BLUE}📊 TEST RESULTS SUMMARY${NC}"
    echo "========================"
    echo "Total: $TOTAL"
    echo -e "Passed: ${GREEN}$PASSED${NC}"
    echo -e "Failed: ${RED}$FAILED${NC}"

    if [ $FAILED -eq 0 ]; then
        echo -e "\n${GREEN}🎉 ALL TESTS PASSED! Ready for production.${NC}"
        exit 0
    else
        echo -e "\n${RED}💥 $FAILED test(s) failed. Please fix before deploying.${NC}"
        exit 1
    fi
}

# Trap to show results on exit
trap show_results EXIT

echo "🔍 Starting comprehensive testing pipeline..."
echo "This will test: Linting → Unit Tests → Build → E2E Tests"
echo ""

# 1. LINTING - Frontend
run_step "Frontend Linting" "npm run lint" "/Users/jeanc/idea-app/apps/next-app"

# 2. LINTING - Backend
run_step "Backend Linting" "npm run lint" "/Users/jeanc/idea-app/apps/websocket-service-nest"

# 3. UNIT TESTS - Frontend
run_step "Frontend Unit Tests" "npm test -- --watchAll=false --passWithNoTests" "/Users/jeanc/idea-app/apps/next-app"

# 4. UNIT TESTS - Backend
run_step "Backend Unit Tests" "npm test -- --watchAll=false --passWithNoTests" "/Users/jeanc/idea-app/apps/websocket-service-nest"

# 5. BUILD - Frontend
run_step "Frontend Build" "npm run build" "/Users/jeanc/idea-app/apps/next-app"

# 6. BUILD - Backend
run_step "Backend Build" "npm run build" "/Users/jeanc/idea-app/apps/websocket-service-nest"

# 7. INTEGRATION TESTS - Docker Environment
echo -e "\n${BLUE}🐳 Setting up Docker test environment...${NC}"

# Start Docker test environment (completely isolated - no local MongoDB interference)
if docker-compose -f /Users/jeanc/idea-app/docker-compose.test.yml up -d --build; then
    echo -e "${GREEN}✅ Docker environment started${NC}"

    # Wait for services to be ready (MongoDB, Redis, Frontend, Backend)
    echo "⏳ Waiting for services to be ready..."
    sleep 25

    # 8. E2E TESTS - Complete User Journey
    run_step "Complete E2E Tests" "npx playwright test tests/e2e/complete-user-journey.spec.ts --timeout=60000 --reporter=line" "/Users/jeanc/idea-app/apps/next-app"

    # Cleanup Docker
    echo -e "\n${BLUE}🧹 Cleaning up Docker environment...${NC}"
    docker-compose -f /Users/jeanc/idea-app/docker-compose.test.yml down -v

else
    echo -e "${RED}❌ Failed to start Docker environment${NC}"
    ((FAILED++))
fi

echo -e "\n${BLUE}🏁 Testing pipeline completed!${NC}"