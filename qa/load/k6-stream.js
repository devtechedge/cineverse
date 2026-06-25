// Simulates 100 concurrent users streaming a video.
// Goal: p95 < 200 ms for /videos/{id}/stream.
//
// Usage:
//   BASE_URL=http://localhost:8000 TOKEN=ey... VIDEO_ID=1 k6 run k6-stream.js

import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  scenarios: {
    streamers: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 50 },
        { duration: '1m',  target: 100 },
        { duration: '2m',  target: 100 },
        { duration: '30s', target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_failed:   ['rate<0.01'],
    http_req_duration: ['p(95)<200'],
  },
};

const BASE  = __ENV.BASE_URL  || 'http://localhost:8000';
const TOKEN = __ENV.TOKEN     || '';
const VIDEO = __ENV.VIDEO_ID  || '1';

export default function () {
  const r = http.get(`${BASE}/api/v1/videos/${VIDEO}/stream`, {
    headers: TOKEN ? { Authorization: `Bearer ${TOKEN}`, Range: 'bytes=0-1048576' } : { Range: 'bytes=0-1048576' },
  });
  check(r, {
    'status 200/206': (res) => res.status === 200 || res.status === 206,
  });
  sleep(Math.random() * 2);
}
