// Stress: 20 concurrent 100 MB upload sessions.
//
// Usage:
//   BASE_URL=http://localhost:8000 TOKEN=ey... k6 run k6-upload.js

import http from 'k6/http';
import { check } from 'k6';
import { SharedArray } from 'k6/data';

export const options = {
  vus: 20,
  duration: '5m',
  thresholds: {
    http_req_failed: ['rate<0.02'],
    http_req_duration: ['p(95)<2000'],
  },
};

const BASE  = __ENV.BASE_URL || 'http://localhost:8000';
const TOKEN = __ENV.TOKEN    || '';

// Build a 1 MiB chunk in memory once; reuse across iterations.
const chunk = new SharedArray('chunk', () => {
  const arr = new Uint8Array(1024 * 1024);
  for (let i = 0; i < arr.length; i++) arr[i] = i % 256;
  return [arr.buffer];
});

export default function () {
  const headers = { Authorization: `Bearer ${TOKEN}` };

  const initRes = http.post(
    `${BASE}/api/v1/videos/init`,
    JSON.stringify({
      filename: `load-${__VU}-${__ITER}.mp4`,
      size_bytes: 100 * 1024 * 1024,
      title: `Load test ${__VU}-${__ITER}`,
    }),
    { headers: { ...headers, 'Content-Type': 'application/json' } },
  );
  check(initRes, { 'init 201': (r) => r.status === 201 });
  if (initRes.status !== 201) return;
  const uploadId = initRes.json('data.upload_id');

  for (let i = 0; i < 100; i++) {
    const r = http.post(
      `${BASE}/api/v1/videos/chunk/${uploadId}`,
      { chunk_index: String(i), chunk: http.file(chunk[0], `c${i}`, 'application/octet-stream') },
      { headers },
    );
    if (r.status !== 200) break;
  }

  http.post(`${BASE}/api/v1/videos/finalize/${uploadId}`, null, { headers });
}
