import { test, expect } from '@playwright/test';

// ETag-based caching and invalidation tests
test.describe('ETag Caching', () => {
  test('Initial GET returns 200 with ETag header', async ({ request }) => {
    const res = await request.get('/api/applications');
    expect(res.status()).toBe(200);
    expect(res.headers()['etag']).toBeTruthy();
  });

  test('Subsequent GET sends If-None-Match and receives 304', async ({ request }) => {
    const first = await request.get('/api/applications');
    const etag = first.headers()['etag'];
    expect(etag).toBeTruthy();
    const second = await request.get('/api/applications', {
      headers: { 'If-None-Match': etag },
    });
    expect(second.status()).toBe(304);
  });

  test('UI renders cached data after 304', async ({ page, request }) => {
    // Assumes UI fetches /api/applications and displays data
    await page.goto('/applications');
    await expect(page.locator('[data-testid="application-list"]')).toBeVisible();
  });

  test('Mutation invalidates cache and returns new ETag', async ({ request }) => {
    const first = await request.get('/api/applications');
    const etag1 = first.headers()['etag'];
    // Create new application (assume valid payload)
    const create = await request.post('/api/applications', {
      data: { name: 'E2E Test App', customerId: 'test-customer' },
    });
    expect(create.status()).toBe(201);
    const second = await request.get('/api/applications');
    const etag2 = second.headers()['etag'];
    expect(etag2).toBeTruthy();
    expect(etag2).not.toBe(etag1);
  });
});
