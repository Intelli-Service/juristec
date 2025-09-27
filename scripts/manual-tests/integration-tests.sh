#!/bin/bash

# 🔗 Juristec Platform - Integration Tests
# Tests complete user flows and service integrations
# Author: Auri (AI Developer)
# Date: September 27, 2025

echo "🔗 Juristec Platform - Integration Tests"
echo "========================================"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

BASE_URL="http://localhost:8080"
BACKEND_URL="http://localhost:8080/api"  # Backend via nginx proxy

# Test counters
integration_tests=0
integration_passed=0
integration_failed=0

print_status() {
    case $2 in
        "success") echo -e "${GREEN}✅ $1${NC}" ;;
        "error") echo -e "${RED}❌ $1${NC}" ;;
        "warning") echo -e "${YELLOW}⚠️  $1${NC}" ;;
        "info") echo -e "${BLUE}ℹ️  $1${NC}" ;;
        *) echo "$1" ;;
    esac
}

run_integration_test() {
    local test_name=$1
    local test_function=$2

    print_status "Running Integration Test: $test_name" "info"
    ((integration_tests++))

    if $test_function; then
        print_status "$test_name - PASSED" "success"
        ((integration_passed++))
    else
        print_status "$test_name - FAILED" "error"
        ((integration_failed++))
    fi
    echo ""
}

# Test 1: User Registration Flow
test_user_registration() {
    print_status "Testing User Registration Flow" "info"

    # Step 1: Start chat session (simulate user accessing chat) via nginx
    local chat_response=$(curl -s -X POST $BACKEND_URL/chat/start \
        -H 'Content-Type: application/json' \
        -d '{"deviceId": "test-device-123", "userAgent": "integration-test"}')

    if echo "$chat_response" | grep -q "conversationId"; then
        print_status "Chat session started successfully" "success"
    else
        print_status "Failed to start chat session" "error"
        return 1
    fi

    # Extract conversation ID
    local conversation_id=$(echo "$chat_response" | grep -o '"conversationId":"[^"]*"' | cut -d'"' -f4)

    if [ -z "$conversation_id" ]; then
        print_status "Could not extract conversation ID" "error"
        return 1
    fi

    # Step 2: Send initial message to AI (should trigger registration) via nginx
    local message_response=$(curl -s -X POST $BACKEND_URL/chat/message \
        -H 'Content-Type: application/json' \
        -d "{\"conversationId\": \"$conversation_id\", \"message\": \"Olá, preciso de ajuda jurídica urgente\", \"deviceId\": \"test-device-123\"}")

    if echo "$message_response" | grep -q "message"; then
        print_status "AI responded to initial message" "success"
    else
        print_status "AI did not respond properly" "error"
        return 1
    fi

    # Step 3: Simulate user providing registration data via nginx
    local registration_data='{
        "conversationId": "'$conversation_id'",
        "message": "Me chamo João Silva, meu email é joao.silva@email.com e meu telefone é 11999999999",
        "deviceId": "test-device-123"
    }'

    local reg_response=$(curl -s -X POST $BACKEND_URL/chat/message \
        -H 'Content-Type: application/json' \
        -d "$registration_data")

    if echo "$reg_response" | grep -q "registered\|cadastrado"; then
        print_status "User registration completed via AI" "success"
        return 0
    else
        print_status "User registration failed" "error"
        return 1
    fi
}

# Test 2: File Upload Flow
test_file_upload() {
    print_status "Testing File Upload Flow" "info"

    # Create a test file
    echo "This is a test legal document" > /tmp/test_document.txt

        # Test file upload endpoint via nginx
    local upload_result=$(curl -s -X POST $BACKEND_URL/uploads \
        -F "file=@/tmp/test_document.txt" \
        -F 'metadata={"conversationId": "test-conversation-123", "userId": "test-user-123"}')

    if echo "$upload_result" | grep -q "url\|fileId\|success"; then
        print_status "File uploaded successfully" "success"

        # Extract file URL for download test
        local file_url=$(echo "$upload_result" | grep -o '"url":"[^"]*"' | cut -d'"' -f4)

        if [ -n "$file_url" ]; then
            # Test file download
            if curl -s --head "$file_url" | grep -q "200\|302"; then
                print_status "File download link is accessible" "success"
                return 0
            else
                print_status "File download link is not accessible" "error"
                return 1
            fi
        fi
        return 0
    else
        print_status "File upload failed" "error"
        return 1
    fi
}

# Test 3: Payment Integration Flow
test_payment_flow() {
    print_status "Testing Payment Integration Flow" "info"

    # Test payment creation
    local payment_data='{
        "amount": 50000,
        "description": "Consulta jurídica inicial",
        "conversationId": "test-conversation-123",
        "userId": "test-user-123",
        "lawyerId": "test-lawyer-123"
    }'

    local payment_response=$(curl -s -X POST $BACKEND_URL/payment/create \
        -H 'Content-Type: application/json' \
        -d "$payment_data")

    if echo "$payment_response" | grep -q "paymentId\|checkoutUrl"; then
        print_status "Payment created successfully" "success"

        # Extract checkout URL
        local checkout_url=$(echo "$payment_response" | grep -o '"checkoutUrl":"[^"]*"' | cut -d'"' -f4)

        if [ -n "$checkout_url" ]; then
            # Test if checkout URL is accessible
            if curl -s --head "$checkout_url" | grep -q "200\|302"; then
                print_status "Payment checkout URL is accessible" "success"
                return 0
            else
                print_status "Payment checkout URL is not accessible" "error"
                return 1
            fi
        fi
        return 0
    else
        print_status "Payment creation failed" "error"
        return 1
    fi
}

# Test 4: Admin Dashboard Access
test_admin_access() {
    print_status "Testing Admin Dashboard Access" "info"

    # Test admin login (using test credentials)
    local login_data='{
        "email": "admin@demo.com",
        "password": "admin123"
    }'

    local login_response=$(curl -s -X POST $BACKEND_URL/auth/login \
        -H 'Content-Type: application/json' \
        -d "$login_data")

    if echo "$login_response" | grep -q "token\|access_token"; then
        print_status "Admin login successful" "success"

        # Extract token
        local token=$(echo "$login_response" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
        if [ -z "$token" ]; then
            token=$(echo "$login_response" | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)
        fi

        if [ -n "$token" ]; then
            # Test admin endpoints
            local admin_response=$(curl -s -H "Authorization: Bearer $token" \
                $BACKEND_URL/admin/stats)

            if echo "$admin_response" | grep -q "totalUsers\|conversations"; then
                print_status "Admin dashboard data accessible" "success"
                return 0
            else
                print_status "Admin dashboard data not accessible" "error"
                return 1
            fi
        else
            print_status "Could not extract auth token" "error"
            return 1
        fi
    else
        print_status "Admin login failed" "error"
        return 1
    fi
}

# Test 5: WebSocket Chat Connection
test_websocket_chat() {
    print_status "Testing WebSocket Chat Connection" "info"

    # Test WebSocket endpoint availability
    local ws_response=$(curl -s -I -N -H "Connection: Upgrade" \
        -H "Upgrade: websocket" \
        -H "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==" \
        -H "Sec-WebSocket-Version: 13" \
        $BACKEND_URL/chat 2>/dev/null | head -1)

    if echo "$ws_response" | grep -q "101\|Switching"; then
        print_status "WebSocket upgrade successful" "success"
        return 0
    else
        print_status "WebSocket connection failed" "error"
        return 1
    fi
}

# Test 6: Database Connectivity
test_database_connectivity() {
    print_status "Testing Database Connectivity" "info"

    # Test database health endpoint
    local db_response=$(curl -s $BACKEND_URL/health/database)

    if echo "$db_response" | grep -q '"status":"ok"\|"connected":true'; then
        print_status "Database connection healthy" "success"
        return 0
    else
        print_status "Database connection issue" "error"
        return 1
    fi
}

# Test 7: AI Service Integration
test_ai_service() {
    print_status "Testing AI Service Integration" "info"

    # Test AI health endpoint
    local ai_response=$(curl -s $BACKEND_URL/ai/health)

    if echo "$ai_response" | grep -q '"status":"ok"\|"available":true'; then
        print_status "AI service is available" "success"
        return 0
    else
        print_status "AI service is not available" "error"
        return 1
    fi
}

# Test 8: Lawyer Dashboard Access
test_lawyer_dashboard() {
    print_status "Testing Lawyer Dashboard Access" "info"

    # Test lawyer login
    local login_data='{
        "email": "lawyer@demo.com",
        "password": "lawyer123"
    }'

    local login_response=$(curl -s -X POST $BACKEND_URL/auth/login \
        -H 'Content-Type: application/json' \
        -d "$login_data")

    if echo "$login_response" | grep -q "token\|access_token"; then
        print_status "Lawyer login successful" "success"

        # Extract token
        local token=$(echo "$login_response" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
        if [ -z "$token" ]; then
            token=$(echo "$login_response" | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)
        fi

        if [ -n "$token" ]; then
            # Test lawyer endpoints
            local lawyer_response=$(curl -s -H "Authorization: Bearer $token" \
                $BACKEND_URL/lawyer/cases)

            if echo "$lawyer_response" | grep -q "cases\|\[\|\{"; then
                print_status "Lawyer dashboard data accessible" "success"
                return 0
            else
                print_status "Lawyer dashboard data not accessible" "error"
                return 1
            fi
        else
            print_status "Could not extract auth token" "error"
            return 1
        fi
    else
        print_status "Lawyer login failed" "error"
        return 1
    fi
}

# Run all integration tests
echo "Starting Integration Tests..."
echo ""

run_integration_test "User Registration Flow" test_user_registration
run_integration_test "File Upload Flow" test_file_upload
run_integration_test "Payment Integration Flow" test_payment_flow
run_integration_test "Admin Dashboard Access" test_admin_access
run_integration_test "WebSocket Chat Connection" test_websocket_chat
run_integration_test "Database Connectivity" test_database_connectivity
run_integration_test "AI Service Integration" test_ai_service
run_integration_test "Lawyer Dashboard Access" test_lawyer_dashboard

# Summary
echo ""
print_status "INTEGRATION TESTS SUMMARY" "info"
echo "============================"
echo "Total Integration Tests: $integration_tests"
echo "Passed: $integration_passed"
echo "Failed: $integration_failed"
echo ""

if [ $integration_failed -eq 0 ]; then
    print_status "🎉 ALL INTEGRATION TESTS PASSED!" "success"
    return 0
else
    success_rate=$((integration_passed * 100 / integration_tests))
    print_status "⚠️ INTEGRATION TESTS: $integration_passed/$integration_tests passed ($success_rate%)" "warning"
    return 1
fi