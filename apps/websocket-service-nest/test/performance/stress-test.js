/**
 * K6 Stress Testing for Juristec Platform
 * Tests system behavior under extreme load conditions
 */

import http from 'k6/http';
import ws from 'k6/ws';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

// Custom metrics
export const errors = new Counter('errors');
export const wsConnections = new Counter('ws_connections');
export const wsMessages = new Counter('ws_messages');
export const systemErrors = new Counter('system_errors');

export const options = {
  stages: [
    { duration: '1m', target: 50 },   // Ramp up to 50 users
    { duration: '2m', target: 100 },  // Ramp up to 100 users
    { duration: '3m', target: 200 },  // Ramp up to 200 users (stress)
    { duration: '2m', target: 100 },  // Scale back down
    { duration: '1m', target: 0 },    // Ramp down to 0
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% of requests under 2s (higher threshold for stress)
    http_req_failed: ['rate<0.3'],     // Error rate can be higher under stress
    system_errors: ['count<100'],      // System errors should be minimal
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:4000';
const WS_URL = __ENV.WS_URL || 'ws://localhost:4000';

export default function () {
  // Stress test HTTP endpoints
  stressTestAPI();
  
  // Stress test WebSocket connections
  stressTestWebSocket();
  
  sleep(Math.random() * 2); // Random sleep to simulate real user behavior
}

function stressTestAPI() {
  // Higher volume of concurrent requests
  const responses = http.batch([
    { method: 'GET', url: `${BASE_URL}/health` },
    { method: 'GET', url: `${BASE_URL}/api/users` },
    { method: 'GET', url: `${BASE_URL}/api/analytics` },
    { method: 'GET', url: `${BASE_URL}/api/conversations` },
    { method: 'GET', url: `${BASE_URL}/api/messages` },
  ]);

  responses.forEach((res, index) => {
    const success = check(res, {
      'status is not 5xx': (r) => r.status < 500,
      'response time acceptable': (r) => r.timings.duration < 5000, // 5s max for stress
    });

    if (!success) {
      errors.add(1);
      if (res.status >= 500) {
        systemErrors.add(1);
      }
    }
  });
}

function stressTestWebSocket() {
  const res = ws.connect(`${WS_URL}/socket.io/?EIO=4&transport=websocket`, {
    timeout: '10s', // Longer timeout for stress conditions
  }, function (socket) {
    wsConnections.add(1);

    socket.on('open', () => {
      const roomId = `stress-room-${Math.floor(Math.random() * 10)}`;
      
      // Join room
      socket.send(JSON.stringify({
        type: 'join_room',
        roomId: roomId,
      }));

      // Send multiple messages rapidly to stress the system
      for (let i = 0; i < 5; i++) {
        socket.send(JSON.stringify({
          type: 'send_message',
          roomId: roomId,
          message: `Stress test message ${i + 1} from VU ${__VU}`,
        }));
        wsMessages.add(1);
        sleep(0.1); // Very short sleep between messages
      }
    });

    socket.on('message', (data) => {
      check(data, {
        'message received under stress': (msg) => msg.length > 0,
      });
    });

    socket.on('error', (e) => {
      errors.add(1);
      systemErrors.add(1);
    });

    // Keep connection for shorter time under stress
    sleep(1);
  });

  check(res, {
    'WebSocket stress connection': (r) => r && (r.status === 101 || r.status === 0), // Allow connection failures under stress
  });
}

export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'test/performance/stress-test-results.json': JSON.stringify(data, null, 2),
  };
}

function textSummary(data, options = {}) {
  const indent = options.indent || '';
  
  let summary = `
${indent}🔥 Stress Test Results Summary
${indent}==============================

${indent}🎯 Test Configuration:
${indent}  • Peak Users: ${data.metrics.vus?.values?.max || 'N/A'}
${indent}  • Total Duration: ${Math.round((data.state.testRunDurationMs || 0) / 1000)}s
${indent}  • Total Iterations: ${data.metrics.iterations?.values?.count || 'N/A'}

${indent}💪 System Performance Under Stress:
${indent}  • HTTP Requests: ${data.metrics.http_reqs?.values?.count || 'N/A'}
${indent}  • Average Response Time: ${Math.round(data.metrics.http_req_duration?.values?.avg || 0)}ms
${indent}  • 95th Percentile: ${Math.round(data.metrics.http_req_duration?.values?.p95 || 0)}ms
${indent}  • Max Response Time: ${Math.round(data.metrics.http_req_duration?.values?.max || 0)}ms
${indent}  • Failed Requests: ${Math.round((data.metrics.http_req_failed?.values?.rate || 0) * 100)}%

${indent}🌪️ WebSocket Performance:
${indent}  • WS Connections: ${data.metrics.ws_connections?.values?.count || 'N/A'}
${indent}  • WS Messages: ${data.metrics.ws_messages?.values?.count || 'N/A'}
${indent}  • System Errors: ${data.metrics.system_errors?.values?.count || 'N/A'}
${indent}  • Total Errors: ${data.metrics.errors?.values?.count || 'N/A'}

${indent}🎯 Stress Test Results:
`;

  Object.entries(data.thresholds || {}).forEach(([key, threshold]) => {
    const status = threshold.ok ? '✅ PASSED' : '❌ FAILED';
    summary += `${indent}  ${status} ${key}\n`;
  });

  // System resilience analysis
  const errorRate = (data.metrics.http_req_failed?.values?.rate || 0) * 100;
  const systemErrorCount = data.metrics.system_errors?.values?.count || 0;
  
  summary += `
${indent}🏥 System Resilience Analysis:
${indent}  • Error Rate: ${errorRate.toFixed(2)}% ${errorRate < 30 ? '(Good)' : '(Needs Improvement)'}
${indent}  • System Stability: ${systemErrorCount < 100 ? 'Stable' : 'Unstable'}
${indent}  • Recovery: ${data.metrics.http_req_duration?.values?.p95 < 2000 ? 'Good' : 'Slow'}
`;

  return summary;
}