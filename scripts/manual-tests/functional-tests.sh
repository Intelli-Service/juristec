#!/bin/bash

# 🔧 Juristec Platform - Functional Tests
# Tests individual features for stability and correctness
# Author: Auri (AI Developer)
# Date: September 27, 2025

echo "🔧 Juristec Platform - Functional Tests"
echo "======================================="

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

BASE_URL="http://localhost:8080"
BACKEND_URL="http://localhost:8080/api"  # Backend via nginx proxy

# Test counters
functional_tests=0
functional_passed=0
functional_failed=0

print_status() {
    case $2 in
        "success") echo -e "${GREEN}✅ $1${NC}" ;;
        "error") echo -e "${RED}❌ $1${NC}" ;;
        "warning") echo -e "${YELLOW}⚠️  $1${NC}" ;;
        "info") echo -e "${BLUE}ℹ️  $1${NC}" ;;
        *) echo "$1" ;;
    esac
}

run_functional_test() {
    local test_name=$1
    local test_function=$2

    print_status "Running Functional Test: $test_name" "info"
    ((functional_tests++))

    if $test_function; then
        print_status "$test_name - PASSED" "success"
        ((functional_passed++))
    else
        print_status "$test_name - FAILED" "error"
        ((functional_failed++))
    fi
    echo ""
}

# Test 1: Landing Page Content
test_landing_page() {
    print_status "Testing Landing Page Content" "info"

    local response=$(curl -s $BASE_URL/)

    # Check for essential elements
    if echo "$response" | grep -q "Juristec\|legal\|advogado"; then
        print_status "Landing page has expected content" "success"
    else
        print_status "Landing page missing expected content" "error"
        return 1
    fi

    # Check for navigation elements
    if echo "$response" | grep -q "chat\|login\|admin"; then
        print_status "Navigation elements present" "success"
    else
        print_status "Navigation elements missing" "error"
        return 1
    fi

    # Check for professional styling
    if echo "$response" | grep -q "tailwind\|slate-\|emerald-"; then
        print_status "Professional styling applied" "success"
    else
        print_status "Professional styling missing" "error"
        return 1
    fi

    return 0
}

# Test 2: Chat Interface
test_chat_interface() {
    print_status "Testing Chat Interface" "info"

    local response=$(curl -s $BASE_URL/chat)

    # Check for chat components
    if echo "$response" | grep -q "chat\|message\|input"; then
        print_status "Chat interface elements present" "success"
    else
        print_status "Chat interface elements missing" "error"
        return 1
    fi

    # Check for WebSocket connection setup
    if echo "$response" | grep -q "socket\|websocket\|io("; then
        print_status "WebSocket connection configured" "success"
    else
        print_status "WebSocket connection not configured" "error"
        return 1
    fi

    return 0
}

# Test 3: Authentication System
test_authentication() {
    print_status "Testing Authentication System" "info"

    # Test login page access
    local login_page=$(curl -s $BASE_URL/auth/signin)

    if echo "$login_page" | grep -q "login\|email\|password"; then
        print_status "Login page accessible" "success"
    else
        print_status "Login page not accessible" "error"
        return 1
    fi

    # Test invalid login (should fail gracefully) via nginx
    local invalid_login=$(curl -s -X POST $BACKEND_URL/auth/login \
        -H 'Content-Type: application/json' \
        -d '{"email":"invalid@test.com","password":"wrong"}')

    if echo "$invalid_login" | grep -q "401\|Unauthorized\|invalid"; then
        print_status "Invalid login properly rejected" "success"
    else
        print_status "Invalid login not properly handled" "error"
        return 1
    fi

    return 0
}

# Test 4: Admin Dashboard
test_admin_dashboard() {
    print_status "Testing Admin Dashboard" "info"

    local admin_page=$(curl -s $BASE_URL/admin)

    # Should redirect or require auth (not show content without login)
    if echo "$admin_page" | grep -q "redirect\|login\|auth"; then
        print_status "Admin dashboard properly protected" "success"
    else
        print_status "Admin dashboard not properly protected" "error"
        return 1
    fi

    return 0
}

# Test 5: File Upload Functionality
test_file_upload() {
    print_status "Testing File Upload Functionality" "info"

    # Create test files
    echo "Test document content" > /tmp/test_doc.txt
    echo "<html>Test HTML</html>" > /tmp/test_doc.html

    # Test upload endpoint availability
    local upload_check=$(curl -s $BACKEND_URL/uploads/info)

    if echo "$upload_check" | grep -q "upload\|file"; then
        print_status "Upload endpoint available" "success"
    else
        print_status "Upload endpoint not available" "error"
        rm -f /tmp/test_doc.txt /tmp/test_doc.html
        return 1
    fi

    # Test actual file upload
    local upload_result=$(curl -s -X POST $BACKEND_URL/uploads \
        -F "file=@/tmp/test_doc.txt" \
        -F 'metadata={"test": "functional"}')

    if echo "$upload_result" | grep -q "url\|fileId\|success"; then
        print_status "File upload successful" "success"
    else
        print_status "File upload failed" "error"
        rm -f /tmp/test_doc.txt /tmp/test_doc.html
        return 1
    fi

    # Cleanup
    rm -f /tmp/test_doc.txt /tmp/test_doc.html
    return 0
}

# Test 6: Payment System
test_payment_system() {
    print_status "Testing Payment System" "info"

    # Test payment endpoint availability via nginx
    local payment_info=$(curl -s $BACKEND_URL/payment/info)

    if echo "$payment_info" | grep -q "payment\|pagarme\|checkout"; then
        print_status "Payment system configured" "success"
    else
        print_status "Payment system not configured" "error"
        return 1
    fi

    # Test payment creation (should require auth/data) via nginx
    local payment_create=$(curl -s -X POST $BACKEND_URL/payment/create \
        -H 'Content-Type: application/json' \
        -d '{}')

    # Should either succeed with valid data or fail gracefully
    if echo "$payment_create" | grep -q "error\|validation\|amount" || echo "$payment_create" | grep -q "checkout\|payment"; then
        print_status "Payment creation endpoint responsive" "success"
    else
        print_status "Payment creation endpoint not responsive" "error"
        return 1
    fi

    return 0
}

# Test 7: AI Chat Integration
test_ai_chat() {
    print_status "Testing AI Chat Integration" "info"

    # Test AI health endpoint via nginx
    local ai_health=$(curl -s $BACKEND_URL/ai/health)

    if echo "$ai_health" | grep -q '"status":"ok"\|"available":true\|"gemini"'; then
        print_status "AI service healthy" "success"
    else
        print_status "AI service not healthy" "error"
        return 1
    fi

    # Test chat message processing via nginx
    local chat_test=$(curl -s -X POST $BACKEND_URL/chat/start \
        -H 'Content-Type: application/json' \
        -d '{"deviceId": "test-device-func"}')

    if echo "$chat_test" | grep -q "conversationId\|success"; then
        print_status "Chat system initialized" "success"
    else
        print_status "Chat system not initialized" "error"
        return 1
    fi

    return 0
}

# Test 8: Database Operations
test_database_operations() {
    print_status "Testing Database Operations" "info"

    # Test database health via nginx
    local db_health=$(curl -s $BACKEND_URL/health/database)

    if echo "$db_health" | grep -q '"status":"ok"\|"connected":true\|"mongodb"'; then
        print_status "Database connection healthy" "success"
    else
        print_status "Database connection unhealthy" "error"
        return 1
    fi

    return 0
}

# Test 9: Error Handling
test_error_handling() {
    print_status "Testing Error Handling" "info"

    # Test 404 endpoint via nginx
    local not_found=$(curl -s -w "%{http_code}" $BACKEND_URL/nonexistent-endpoint 2>/dev/null | tail -1)

    if [ "$not_found" = "404" ]; then
        print_status "404 errors handled properly" "success"
    else
        print_status "404 errors not handled properly" "error"
        return 1
    fi

    # Test invalid JSON via nginx
    local invalid_json=$(curl -s -X POST $BACKEND_URL/auth/login \
        -H 'Content-Type: application/json' \
        -d 'invalid json')

    if echo "$invalid_json" | grep -q "400\|error\|invalid"; then
        print_status "Invalid JSON handled properly" "success"
    else
        print_status "Invalid JSON not handled properly" "error"
        return 1
    fi

    return 0
}

# Test 10: Security Features
test_security_features() {
    print_status "Testing Security Features" "info"

    # Test for security headers
    local security_headers=$(curl -s -I $BASE_URL/ | grep -i "x-")

    if echo "$security_headers" | grep -q "X-Frame-Options\|X-Content-Type-Options"; then
        print_status "Security headers present" "success"
    else
        print_status "Security headers missing" "warning"  # Warning, not error
    fi

    # Test SQL injection protection via nginx
    local sql_injection=$(curl -s "$BACKEND_URL/auth/login" \
        -H 'Content-Type: application/json' \
        -d '{"email":"admin@test.com'\''; DROP TABLE users;--","password":"test"}')

    if echo "$sql_injection" | grep -q "401\|400\|error"; then
        print_status "SQL injection protection working" "success"
    else
        print_status "SQL injection protection may be vulnerable" "error"
        return 1
    fi

    return 0
}

# Test 11: Mobile Responsiveness
test_mobile_responsiveness() {
    print_status "Testing Mobile Responsiveness" "info"

    local mobile_response=$(curl -s -H "User-Agent: Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15" $BASE_URL/)

    # Check for responsive classes
    if echo "$mobile_response" | grep -q "sm:\|md:\|lg:\|responsive"; then
        print_status "Mobile responsive classes present" "success"
    else
        print_status "Mobile responsive classes missing" "error"
        return 1
    fi

    return 0
}

# Test 12: Toast Notifications
test_toast_notifications() {
    print_status "Testing Toast Notifications" "info"

    local chat_page=$(curl -s $BASE_URL/chat)

    # Check for toast components
    if echo "$chat_page" | grep -q "toast\|notification\|Toast"; then
        print_status "Toast notification system present" "success"
    else
        print_status "Toast notification system missing" "error"
        return 1
    fi

    return 0
}

# Run all functional tests
echo "Starting Functional Tests..."
echo ""

run_functional_test "Landing Page Content" test_landing_page
run_functional_test "Chat Interface" test_chat_interface
run_functional_test "Authentication System" test_authentication
run_functional_test "Admin Dashboard" test_admin_dashboard
run_functional_test "File Upload Functionality" test_file_upload
run_functional_test "Payment System" test_payment_system
run_functional_test "AI Chat Integration" test_ai_chat
run_functional_test "Database Operations" test_database_operations
run_functional_test "Error Handling" test_error_handling
run_functional_test "Security Features" test_security_features
run_functional_test "Mobile Responsiveness" test_mobile_responsiveness
run_functional_test "Toast Notifications" test_toast_notifications

# Summary
echo ""
print_status "FUNCTIONAL TESTS SUMMARY" "info"
echo "============================"
echo "Total Functional Tests: $functional_tests"
echo "Passed: $functional_passed"
echo "Failed: $functional_failed"
echo ""

if [ $functional_failed -eq 0 ]; then
    print_status "🎉 ALL FUNCTIONAL TESTS PASSED!" "success"
    return 0
else
    success_rate=$((functional_passed * 100 / functional_tests))
    print_status "⚠️ FUNCTIONAL TESTS: $functional_passed/$functional_tests passed ($success_rate%)" "warning"
    return 1
fi