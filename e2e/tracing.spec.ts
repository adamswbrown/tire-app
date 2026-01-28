import { test, expect } from '@playwright/test';

// X-Request-Id and X-Response-Time header validation
test.describe('Request Tracing', () => {
  test('API responses include X-Request-Id and X-Response-Time', async ({ request }) => {
    const res = await request.get('/api/applications');
    const reqId = res.headers()['x-request-id'];
    const resTime = res.headers()['x-response-time'];
    expect(reqId).toBeTruthy();
    expect(resTime).toBeTruthy();
  });

  test('Request IDs are unique per request', async ({ request }) => {
    const res1 = await request.get('/api/applications');
    const res2 = await request.get('/api/applications');
    expect(res1.headers()['x-request-id']).not.toBe(res2.headers()['x-request-id']);
  });
});
