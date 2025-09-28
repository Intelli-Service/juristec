#!/bin/bash

# 🚀 Juristec Platform - Complete Testing Suite
# Professional testing pipeline with multiple layers
# Author: Auri (AI Developer)
# Date: September 27, 2025

echo "🚀 Juristec Platform - Complete Testing Suite"
echo "============================================"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

# Test results
unit_passed=0
unit_failed=0
integration_passed=0
integration_failed=0
e2e_passed=0
e2e_failed=0
accessibility_passed=0
accessibility_failed=0
performance_passed=0
performance_failed=0

print_status() {
    case $2 in
        "success") echo -e "${GREEN}✅ $1${NC}" ;;
        "error") echo -e "${RED}❌ $1${NC}" ;;
        "warning") echo -e "${YELLOW}⚠️  $1${NC}" ;;
        "info") echo -e "${BLUE}ℹ️  $1${NC}" ;;
        "section") echo -e "${PURPLE}📋 $1${NC}" ;;
        *) echo "$1" ;;
    esac
}

run_test_suite() {
    local suite_name=$1
    local command=$2
    local result_var=$3

    print_status "Running $suite_name" "section"
    echo "----------------------------------------"

    if eval "$command"; then
        print_status "$suite_name - PASSED" "success"
        eval "${result_var}_passed=\$((${result_var}_passed + 1))"
        return 0
    else
        print_status "$suite_name - FAILED" "error"
        eval "${result_var}_failed=\$((${result_var}_failed + 1))"
        return 1
    fi
}

# 1. Unit Tests (Jest)
print_status "1. UNIT TESTS (Jest)" "section"
echo "======================"
cd apps/next-app

run_test_suite "Frontend Unit Tests" "npm run test -- --coverage --watchAll=false" "unit"
run_test_suite "Backend Unit Tests" "cd ../../websocket-service-nest && npm run test -- --coverage --watchAll=false" "unit"

cd ../..

# 2. Integration Tests (Bash Scripts)
print_status "2. INTEGRATION TESTS (API/Infra)" "section"
echo "=================================="
run_test_suite "API Integration Tests" "bash scripts/manual-tests/integration-tests.sh" "integration"
run_test_suite "Functional Tests" "bash scripts/manual-tests/functional-tests.sh" "integration"

# 3. E2E Tests (Playwright)
print_status "3. END-TO-END TESTS (Playwright)" "section"
echo "=================================="
cd apps/next-app

run_test_suite "Basic E2E Tests" "npx playwright test landing-page.spec.ts chat-flow.spec.ts" "e2e"
run_test_suite "Advanced Frontend Tests" "npx playwright test advanced-frontend.spec.ts" "e2e"
run_test_suite "Integration with Mocks" "npx playwright test integration-mocks.spec.ts" "e2e"

cd ../..

# 4. Accessibility Tests
print_status "4. ACCESSIBILITY TESTS" "section"
echo "=========================="
cd apps/next-app

run_test_suite "Accessibility Audit" "npx playwright test accessibility.spec.ts" "accessibility"

cd ../..

# 5. Performance Tests
print_status "5. PERFORMANCE TESTS" "section"
echo "========================="
run_test_suite "Load & Performance Tests" "bash scripts/manual-tests/performance-tests.sh" "performance"

cd apps/next-app
run_test_suite "Visual Performance Tests" "npx playwright test visual-performance.spec.ts" "performance"
cd ../..

# Final Results
print_status "TESTING RESULTS SUMMARY" "section"
echo "=========================="

total_passed=$((unit_passed + integration_passed + e2e_passed + accessibility_passed + performance_passed))
total_failed=$((unit_failed + integration_failed + e2e_failed + accessibility_failed + performance_failed))
total_tests=$((total_passed + total_failed))

echo ""
echo "📊 Detailed Results:"
echo "Unit Tests: $unit_passed passed, $unit_failed failed"
echo "Integration Tests: $integration_passed passed, $integration_failed failed"
echo "E2E Tests: $e2e_passed passed, $e2e_failed failed"
echo "Accessibility Tests: $accessibility_passed passed, $accessibility_failed failed"
echo "Performance Tests: $performance_passed passed, $performance_failed failed"
echo ""
echo "Total: $total_tests tests run"
echo "Passed: $total_passed"
echo "Failed: $total_failed"

success_rate=$((total_passed * 100 / total_tests))

if [ $total_failed -eq 0 ]; then
    print_status "🎉 ALL TESTS PASSED! ($success_rate% success rate)" "success"
    exit 0
elif [ $success_rate -ge 90 ]; then
    print_status "✅ EXCELLENT! ($success_rate% success rate)" "success"
    exit 0
elif [ $success_rate -ge 75 ]; then
    print_status "⚠️ GOOD ($success_rate% success rate) - Minor issues to fix" "warning"
    exit 1
else
    print_status "❌ NEEDS ATTENTION ($success_rate% success rate)" "error"
    exit 1
fi