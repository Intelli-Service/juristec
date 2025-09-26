/**
 * K6 Load Testing for Juristec Platform
 * Tests normal load conditions to ensure system performance
 */

import http from 'k6/http';
import ws from 'k6/ws';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

// Custom metrics
export const errors = new Counter('errors');
export const wsConnections = new Counter('ws_connections');
export const wsMessages = new Counter('ws_messages');
export const responseTimes = new Trend('response_times');

export const options = {
  stages: [
    { duration: '2m', target: 10 }, // Ramp up to 10 users
    { duration: '5m', target: 10 }, // Stay at 10 users
    { duration: '2m', target: 20 }, // Ramp up to 20 users
    { duration: '5m', target: 20 }, // Stay at 20 users
    { duration: '2m', target: 0 },  // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests must complete below 500ms
    http_req_failed: ['rate<0.1'],    // Error rate must be less than 10%
    ws_connecting: ['p(95)<1000'],    // WebSocket connections under 1s
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:4000';
const WS_URL = __ENV.WS_URL || 'ws://localhost:4000';

export default function () {
  // Test HTTP endpoints
  testRestAPI();
  
  // Test WebSocket connections
  testWebSocketChat();
  
  sleep(1);
}

function testRestAPI() {
  const responses = http.batch([
    // Health check
    { method: 'GET', url: `${BASE_URL}/health` },
    
    // User endpoints
    { method: 'GET', url: `${BASE_URL}/api/users` },
    
    // Analytics endpoints
    { method: 'GET', url: `${BASE_URL}/api/analytics` },
  ]);

  responses.forEach((res, index) => {
    const success = check(res, {
      'status is 200 or 401': (r) => r.status === 200 || r.status === 401, // 401 expected for protected routes
      'response time < 500ms': (r) => r.timings.duration < 500,
    });

    if (!success) {
      errors.add(1);
    }

    responseTimes.add(res.timings.duration);
  });
}

function testWebSocketChat() {
  const res = ws.connect(`${WS_URL}/socket.io/?EIO=4&transport=websocket`, {}, function (socket) {
    wsConnections.add(1);

    socket.on('open', () => {
      // Join a test room
      socket.send(JSON.stringify({
        type: 'join_room',
        roomId: `test-room-${__VU}`,
      }));

      // Send test messages
      for (let i = 0; i < 3; i++) {
        socket.send(JSON.stringify({
          type: 'send_message',
          roomId: `test-room-${__VU}`,
          message: `Test message ${i + 1} from VU ${__VU}`,
        }));
        wsMessages.add(1);
        sleep(0.5);
      }
    });

    socket.on('message', (data) => {
      // Handle incoming messages
      check(data, {
        'message received': (msg) => msg.length > 0,
      });
    });

    socket.on('error', (e) => {
      errors.add(1);
      console.error('WebSocket error:', e);
    });

    // Keep connection open for a short time
    sleep(2);
  });

  check(res, {
    'WebSocket connection established': (r) => r && r.status === 101,
  });
}

export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'test/performance/load-test-results.json': JSON.stringify(data, null, 2),
  };
}

function textSummary(data, options = {}) {
  const indent = options.indent || '';
  const enableColors = options.enableColors || false;
  
  let summary = `
${indent}📊 Load Test Results Summary
${indent}============================

${indent}🔍 Test Configuration:
${indent}  • Duration: ${data.state.testRunDurationMs}ms
${indent}  • Virtual Users: ${data.metrics.vus?.values?.max || 'N/A'}
${indent}  • Iterations: ${data.metrics.iterations?.values?.count || 'N/A'}

${indent}⚡ Performance Metrics:
${indent}  • HTTP Requests: ${data.metrics.http_reqs?.values?.count || 'N/A'}
${indent}  • Average Response Time: ${Math.round(data.metrics.http_req_duration?.values?.avg || 0)}ms
${indent}  • 95th Percentile: ${Math.round(data.metrics.http_req_duration?.values?.p95 || 0)}ms
${indent}  • Failed Requests: ${data.metrics.http_req_failed?.values?.rate * 100 || 0}%

${indent}🌐 WebSocket Metrics:
${indent}  • WS Connections: ${data.metrics.ws_connections?.values?.count || 'N/A'}
${indent}  • WS Messages: ${data.metrics.ws_messages?.values?.count || 'N/A'}
${indent}  • Errors: ${data.metrics.errors?.values?.count || 'N/A'}

${indent}✅ Thresholds:
`;

  Object.entries(data.thresholds || {}).forEach(([key, threshold]) => {
    const status = threshold.ok ? '✅' : '❌';
    summary += `${indent}  ${status} ${key}\n`;
  });

  return summary;
}