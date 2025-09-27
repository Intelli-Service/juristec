#!/bin/bash

# ⚡ Juristec Platform - Load & Performance Tests
# Basic performance testing for production readiness
# Author: Auri (AI Developer)
# Date: September 27, 2025

echo "⚡ Juristec Platform - Load & Performance Tests"
echo "==============================================="

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

BASE_URL="http://localhost:8080"
BACKEND_URL="http://localhost:4000"

print_status() {
    case $2 in
        "success") echo -e "${GREEN}✅ $1${NC}" ;;
        "error") echo -e "${RED}❌ $1${NC}" ;;
        "warning") echo -e "${YELLOW}⚠️  $1${NC}" ;;
        "info") echo -e "${BLUE}ℹ️  $1${NC}" ;;
        *) echo "$1" ;;
    esac
}

# Function to measure response time
measure_response_time() {
    local url=$1
    local num_requests=${2:-10}

    print_status "Measuring response time for $url ($num_requests requests)" "info"

    total_time=0
    successful_requests=0

    for i in $(seq 1 $num_requests); do
        start_time=$(date +%s%3N)
        if curl -s --max-time 10 "$url" > /dev/null 2>&1; then
            end_time=$(date +%s%3N)
            response_time=$((end_time - start_time))
            total_time=$((total_time + response_time))
            ((successful_requests++))
            echo -n "."
        else
            echo -n "x"
        fi
    done
    echo ""

    if [ $successful_requests -gt 0 ]; then
        avg_time=$((total_time / successful_requests))
        success_rate=$((successful_requests * 100 / num_requests))

        print_status "Results: $successful_requests/$num_requests successful ($success_rate%)" "info"
        print_status "Average response time: ${avg_time}ms" "info"

        # Performance criteria
        if [ $avg_time -lt 500 ] && [ $success_rate -ge 95 ]; then
            print_status "PERFORMANCE: EXCELLENT" "success"
            return 0
        elif [ $avg_time -lt 1000 ] && [ $success_rate -ge 90 ]; then
            print_status "PERFORMANCE: GOOD" "success"
            return 0
        elif [ $avg_time -lt 2000 ] && [ $success_rate -ge 80 ]; then
            print_status "PERFORMANCE: ACCEPTABLE" "warning"
            return 0
        else
            print_status "PERFORMANCE: POOR" "error"
            return 1
        fi
    else
        print_status "All requests failed" "error"
        return 1
    fi
}

# Function to test concurrent users
test_concurrent_users() {
    local url=$1
    local num_concurrent=${2:-5}
    local duration=${3:-10}

    print_status "Testing $num_concurrent concurrent users for ${duration}s" "info"

    # Create a simple load test using curl
    pids=()
    success_count=0
    total_requests=0

    # Start concurrent requests
    for i in $(seq 1 $num_concurrent); do
        (
            local local_success=0
            local local_total=0
            local end_time=$((SECONDS + duration))

            while [ $SECONDS -lt $end_time ]; do
                ((local_total++))
                if curl -s --max-time 5 "$url" > /dev/null 2>&1; then
                    ((local_success++))
                fi
                sleep 0.1  # Small delay between requests
            done

            echo "$local_success $local_total"
        ) &
        pids+=($!)
    done

    # Wait for all background processes and collect results
    total_success=0
    total_requests=0

    for pid in "${pids[@]}"; do
        wait $pid
        result=$(wait $pid 2>/dev/null)
        if [ -n "$result" ]; then
            success=$(echo $result | cut -d' ' -f1)
            total=$(echo $result | cut -d' ' -f2)
            total_success=$((total_success + success))
            total_requests=$((total_requests + total))
        fi
    done

    if [ $total_requests -gt 0 ]; then
        success_rate=$((total_success * 100 / total_requests))
        rps=$((total_requests / duration))

        print_status "Concurrent test results:" "info"
        print_status "  - Total requests: $total_requests" "info"
        print_status "  - Successful: $total_success ($success_rate%)" "info"
        print_status "  - Requests/second: $rps" "info"

        # Concurrency criteria
        if [ $success_rate -ge 95 ] && [ $rps -ge 10 ]; then
            print_status "CONCURRENCY: EXCELLENT" "success"
            return 0
        elif [ $success_rate -ge 90 ] && [ $rps -ge 5 ]; then
            print_status "CONCURRENCY: GOOD" "success"
            return 0
        elif [ $success_rate -ge 80 ] && [ $rps -ge 2 ]; then
            print_status "CONCURRENCY: ACCEPTABLE" "warning"
            return 0
        else
            print_status "CONCURRENCY: POOR" "error"
            return 1
        fi
    else
        print_status "No requests completed" "error"
        return 1
    fi
}

# Function to test memory usage
test_memory_usage() {
    print_status "Testing memory usage" "info"

    # Get container memory usage
    memory_usage=$(docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}" | grep juristec | awk '{print $3}')

    if [ -n "$memory_usage" ]; then
        print_status "Current memory usage: $memory_usage" "info"

        # Extract numeric value (basic check)
        mem_value=$(echo $memory_usage | sed 's/MiB//g' | sed 's/GiB/*1024/g' | bc 2>/dev/null || echo "0")

        if [ -n "$mem_value" ] && [ $(echo "$mem_value < 500" | bc -l 2>/dev/null || echo "1") -eq 1 ]; then
            print_status "MEMORY: Within acceptable limits" "success"
            return 0
        else
            print_status "MEMORY: High usage detected" "warning"
            return 0  # Not a failure, just a warning
        fi
    else
        print_status "Could not retrieve memory usage" "warning"
        return 0
    fi
}

# Function to test API endpoints performance
test_api_performance() {
    local endpoint=$1
    local method=${2:-GET}
    local data=${3:-}

    print_status "Testing API performance: $method $endpoint" "info"

    # Single request timing
    start_time=$(date +%s%3N)

    if [ "$method" = "POST" ] && [ -n "$data" ]; then
        curl -s -X POST -H "Content-Type: application/json" -d "$data" "$endpoint" > /dev/null 2>&1
    else
        curl -s "$endpoint" > /dev/null 2>&1
    fi

    end_time=$(date +%s%3N)
    response_time=$((end_time - start_time))

    print_status "API response time: ${response_time}ms" "info"

    if [ $response_time -lt 1000 ]; then
        print_status "API PERFORMANCE: GOOD" "success"
        return 0
    elif [ $response_time -lt 3000 ]; then
        print_status "API PERFORMANCE: ACCEPTABLE" "warning"
        return 0
    else
        print_status "API PERFORMANCE: SLOW" "error"
        return 1
    fi
}

# Main performance tests
echo "Starting Performance Tests..."
echo ""

# 1. Frontend Performance
print_status "1. FRONTEND PERFORMANCE TESTS" "info"
echo "=================================="

if measure_response_time "$BASE_URL/" 20; then
    print_status "Frontend performance test passed" "success"
else
    print_status "Frontend performance test failed" "error"
fi

# 2. Backend API Performance
print_status "2. BACKEND API PERFORMANCE TESTS" "info"
echo "======================================="

if test_api_performance "$BACKEND_URL/health"; then
    print_status "Health check performance test passed" "success"
else
    print_status "Health check performance test failed" "error"
fi

if test_api_performance "$BACKEND_URL/chat/status"; then
    print_status "Chat status performance test passed" "success"
else
    print_status "Chat status performance test failed" "error"
fi

# 3. Concurrency Tests
print_status "3. CONCURRENCY TESTS" "info"
echo "======================="

if test_concurrent_users "$BASE_URL/" 3 5; then
    print_status "Frontend concurrency test passed" "success"
else
    print_status "Frontend concurrency test failed" "error"
fi

if test_concurrent_users "$BACKEND_URL/health" 5 5; then
    print_status "Backend concurrency test passed" "success"
else
    print_status "Backend concurrency test failed" "error"
fi

# 4. Memory Usage
print_status "4. MEMORY USAGE TESTS" "info"
echo "========================="

test_memory_usage

# 5. Database Performance (if available)
print_status "5. DATABASE PERFORMANCE TESTS" "info"
echo "==================================="

if curl -s "$BACKEND_URL/health/database" > /dev/null 2>&1; then
    if test_api_performance "$BACKEND_URL/health/database"; then
        print_status "Database performance test passed" "success"
    else
        print_status "Database performance test failed" "error"
    fi
else
    print_status "Database health endpoint not available - skipping" "warning"
fi

# 6. File Upload Performance
print_status "6. FILE UPLOAD PERFORMANCE TESTS" "info"
echo "====================================="

# Create a test file
echo "This is a test file for performance testing" > /tmp/perf_test.txt

start_time=$(date +%s%3N)
upload_result=$(curl -s -X POST "$BACKEND_URL/uploads" \
    -F "file=@/tmp/perf_test.txt" \
    -F 'metadata={"test": "performance"}' 2>/dev/null)

end_time=$(date +%s%3N)
upload_time=$((end_time - start_time))

if echo "$upload_result" | grep -q "url\|fileId"; then
    print_status "File upload time: ${upload_time}ms" "info"
    if [ $upload_time -lt 5000 ]; then
        print_status "UPLOAD PERFORMANCE: GOOD" "success"
    else
        print_status "UPLOAD PERFORMANCE: SLOW" "warning"
    fi
else
    print_status "File upload failed" "error"
fi

# Cleanup
rm -f /tmp/perf_test.txt

# Performance Summary
print_status "PERFORMANCE TESTS COMPLETED" "info"
echo "=================================="
print_status "Review the results above for any performance issues" "info"
print_status "Recommended thresholds:" "info"
echo "  • Response time: < 1000ms"
echo "  • Success rate: > 95%"
echo "  • Concurrent requests: > 5 RPS"
echo "  • Memory usage: < 500MB per service"

print_status "🎯 Performance testing completed!" "success"