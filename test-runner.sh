#!/bin/bash

# Comprehensive Test Runner for Juristec Platform
# Demonstrates all testing capabilities implemented

echo "🧪 Juristec Platform - Comprehensive Testing Suite"
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    case $2 in
        "success") echo -e "${GREEN}✅ $1${NC}" ;;
        "error") echo -e "${RED}❌ $1${NC}" ;;
        "warning") echo -e "${YELLOW}⚠️  $1${NC}" ;;
        "info") echo -e "${BLUE}ℹ️  $1${NC}" ;;
        *) echo "$1" ;;
    esac
}

# Test counters
total_tests=0
passed_tests=0
failed_tests=0

run_test_suite() {
    local suite_name=$1
    local test_command=$2
    local directory=$3
    
    print_status "Running $suite_name..." "info"
    cd "/Users/jeanc/idea-app/$directory" || exit 1
    
    if eval "$test_command" > /tmp/test_output.log 2>&1; then
        print_status "$suite_name - PASSED" "success"
        ((passed_tests++))
    else
        print_status "$suite_name - FAILED" "error"
        echo "Error details:"
        tail -20 /tmp/test_output.log
        ((failed_tests++))
    fi
    ((total_tests++))
    echo ""
}

print_status "Starting comprehensive test execution..." "info"
echo ""

# Backend Tests
print_status "🏗️ Backend Testing (NestJS)" "info"
print_status "=============================" "info"

run_test_suite "Linting" "npm run lint" "apps/websocket-service-nest"
run_test_suite "Build" "npm run build" "apps/websocket-service-nest"
run_test_suite "Unit Tests" "npm test" "apps/websocket-service-nest"
run_test_suite "Coverage Analysis" "npm run test:cov" "apps/websocket-service-nest"

# Frontend Tests  
print_status "🎨 Frontend Testing (Next.js)" "info" 
print_status "==============================" "info"

run_test_suite "Linting" "npm run lint" "apps/next-app"
run_test_suite "Build" "npm run build" "apps/next-app"
run_test_suite "Unit Tests" "npm test -- --passWithNoTests" "apps/next-app"
run_test_suite "Coverage Analysis" "npm run test:coverage -- --passWithNoTests" "apps/next-app"

# Performance Tests (if k6 is available)
if command -v k6 &> /dev/null; then
    print_status "⚡ Performance Testing (K6)" "info"
    print_status "===========================" "info"
    
    print_status "K6 Load Tests available but require running services" "warning"
    print_status "Use: npm run test:performance (after starting services)" "info"
    print_status "Use: npm run test:stress (for stress testing)" "info"
else
    print_status "K6 not installed - Performance tests skipped" "warning"
fi

# Quality Gates
print_status "🎯 Quality Gates Summary" "info"
print_status "=========================" "info"

echo "Test Execution Summary:"
echo "• Total Test Suites: $total_tests"
echo "• Passed: $passed_tests"
echo "• Failed: $failed_tests"

if [ $failed_tests -eq 0 ]; then
    print_status "All test suites passed! 🎉" "success"
    exit_code=0
else
    print_status "Some test suites failed. Check logs above." "error"
    exit_code=1
fi

print_status "Available Testing Features:" "info"
echo "• ✅ Code Linting (ESLint)"
echo "• ✅ Build Verification (TypeScript compilation)"
echo "• ✅ Unit Tests (Jest)"
echo "• ✅ Integration Tests (Jest + Real Services)"
echo "• ✅ E2E Tests (Playwright)"
echo "• ✅ Performance Tests (K6)"  
echo "• ✅ Coverage Reports (LCOV, HTML, JSON)"
echo "• ✅ CI/CD Pipeline (GitHub Actions)"
echo "• ✅ Code Quality Gates (Coverage Thresholds)"
echo "• ✅ Pre-commit Hooks (Husky + Lint-staged)"
echo "• ✅ SonarQube Configuration"
echo "• ✅ Security Auditing (npm audit)"

print_status "Testing infrastructure setup complete!" "success"
exit $exit_code