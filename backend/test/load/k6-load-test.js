/**
 * K6 Load Testing Script for TernantApp API
 *
 * Install k6: https://k6.io/docs/getting-started/installation/
 * Run: k6 run test/load/k6-load-test.js
 *
 * Scenarios:
 * 1. Smoke test - 1 VU for 1 minute
 * 2. Load test - Ramp up to 100 VUs over 5 minutes
 * 3. Stress test - Ramp up to 200 VUs to find breaking point
 * 4. Spike test - Sudden spike to 500 VUs
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');

// Test configuration
export const options = {
  scenarios: {
    smoke: {
      executor: 'constant-vus',
      vus: 1,
      duration: '1m',
      tags: { test_type: 'smoke' },
    },
    load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 50 },   // Ramp up to 50 VUs
        { duration: '3m', target: 100 },  // Ramp up to 100 VUs
        { duration: '2m', target: 100 },  // Stay at 100 VUs
        { duration: '2m', target: 0 },    // Ramp down
      ],
      startTime: '1m', // Start after smoke test
      tags: { test_type: 'load' },
    },
    stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 100 },
        { duration: '5m', target: 200 },
        { duration: '2m', target: 200 },
        { duration: '3m', target: 300 },
        { duration: '2m', target: 0 },
      ],
      startTime: '10m', // Start after load test
      tags: { test_type: 'stress' },
    },
    spike: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 500 },  // Spike to 500 VUs
        { duration: '1m', target: 500 },   // Stay at 500
        { duration: '10s', target: 0 },    // Quick ramp down
      ],
      startTime: '24m', // Start after stress test
      tags: { test_type: 'spike' },
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'], // 95% < 500ms, 99% < 1s
    http_req_failed: ['rate<0.01'], // Error rate < 1%
    errors: ['rate<0.1'], // Custom error rate < 10%
  },
};

// Configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';
const API_PREFIX = '/api/v1';

// Test data
let accessToken = '';

export function setup() {
  // Register or login to get access token
  const loginRes = http.post(`${BASE_URL}${API_PREFIX}/auth/login`,
    JSON.stringify({
      email: 'superadmin@ternantapp.com',
      password: 'SuperAdmin@2025',
    }),
    {
      headers: { 'Content-Type': 'application/json' },
    }
  );

  if (loginRes.status === 200) {
    const body = JSON.parse(loginRes.body);
    return { accessToken: body.accessToken };
  }

  // If login fails, try to register
  const registerRes = http.post(`${BASE_URL}${API_PREFIX}/auth/register`,
    JSON.stringify({
      email: `loadtest-${Date.now()}@example.com`,
      password: 'LoadTest@123',
      firstName: 'Load',
      lastName: 'Test',
      companyId: 'load-test-company',
    }),
    {
      headers: { 'Content-Type': 'application/json' },
    }
  );

  const body = JSON.parse(registerRes.body);
  return { accessToken: body.accessToken };
}

export default function (data) {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${data.accessToken}`,
  };

  // Test scenarios
  testHealthEndpoint();
  testDashboardStats(headers);
  testListCompounds(headers);
  testListApartments(headers);
  testListTenants(headers);

  sleep(1); // Think time between requests
}

function testHealthEndpoint() {
  const res = http.get(`${BASE_URL}${API_PREFIX}/health`);

  const success = check(res, {
    'health check is 200': (r) => r.status === 200,
    'health check has status ok': (r) => JSON.parse(r.body).status === 'ok',
  });

  errorRate.add(!success);
}

function testDashboardStats(headers) {
  const res = http.get(`${BASE_URL}${API_PREFIX}/dashboard/stats`, { headers });

  const success = check(res, {
    'dashboard stats is 200': (r) => r.status === 200,
    'dashboard has total units': (r) => JSON.parse(r.body).totalUnits !== undefined,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });

  errorRate.add(!success);
}

function testListCompounds(headers) {
  const res = http.get(`${BASE_URL}${API_PREFIX}/compounds`, { headers });

  const success = check(res, {
    'list compounds is 200 or 401': (r) => r.status === 200 || r.status === 401,
    'response time < 300ms': (r) => r.timings.duration < 300,
  });

  errorRate.add(!success && res.status !== 401);
}

function testListApartments(headers) {
  const res = http.get(`${BASE_URL}${API_PREFIX}/apartments`, { headers });

  const success = check(res, {
    'list apartments is 200 or 401': (r) => r.status === 200 || r.status === 401,
    'response time < 300ms': (r) => r.timings.duration < 300,
  });

  errorRate.add(!success && res.status !== 401);
}

function testListTenants(headers) {
  const res = http.get(`${BASE_URL}${API_PREFIX}/tenants`, { headers });

  const success = check(res, {
    'list tenants is 200 or 401': (r) => r.status === 200 || r.status === 401,
    'response time < 300ms': (r) => r.timings.duration < 300,
  });

  errorRate.add(!success && res.status !== 401);
}

export function teardown(data) {
  // Cleanup if needed
  console.log('Load test completed');
}
