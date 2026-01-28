import { test, expect } from '@playwright/test';

// Error logging and API error response validation
test.describe('Error Logging', () => {
  test('Prisma failure is logged and sanitized', async ({ request }) => {
    // Force Prisma error (e.g., invalid ID)
    const res = await request.get('/api/applications/invalid-id');
    expect(res.status()).toBeGreaterThanOrEqual(400);
    const body = await res.json();
    expect(body.message).toBeDefined();
    expect(body.code).toMatch(/ApiErrorCode/);
    expect(body.stack).toBeUndefined();
    expect(JSON.stringify(body)).not.toMatch(/Prisma/);
    // Insert assertion for error log event
  });

  test('Zod validation error is logged and sanitized', async ({ request }) => {
    const res = await request.post('/api/applications', {
      data: { invalid: 'payload' },
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
    const body = await res.json();
    expect(body.message).toBeDefined();
    expect(body.code).toMatch(/ApiErrorCode/);
    expect(body.stack).toBeUndefined();
    // Insert assertion for error log event
  });

  test('Unknown runtime exception is logged and sanitized', async ({ request }) => {
    // Simulate unknown error (e.g., special test route or payload)
    const res = await request.get('/api/throw-runtime-error');
    expect(res.status()).toBeGreaterThanOrEqual(500);
    const body = await res.json();
    expect(body.message).toBeDefined();
    expect(body.code).toMatch(/ApiErrorCode/);
    expect(body.stack).toBeUndefined();
    // Insert assertion for error log event
  });
});
