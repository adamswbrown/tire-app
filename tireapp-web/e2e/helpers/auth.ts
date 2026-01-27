import { Page } from '@playwright/test';

/**
 * Mock authenticated session for E2E tests
 * In production, Auth.js would handle this via Entra ID
 */
export async function mockAuthSession(page: Page, role: 'Admin' | 'Consultant' | 'Viewer' = 'Admin') {
  // Set mock session cookie
  await page.context().addCookies([
    {
      name: 'next-auth.session-token',
      value: 'mock-session-token-for-testing',
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      sameSite: 'Lax',
      expires: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
    },
  ]);

  // Mock session API endpoint
  await page.route('**/api/auth/session', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        user: {
          id: 'test-user-id',
          name: 'Test User',
          email: 'test@example.com',
          role: role,
        },
        expires: new Date(Date.now() + 3600 * 1000).toISOString(),
      }),
    });
  });
}

/**
 * Clear authentication state
 */
export async function clearAuth(page: Page) {
  await page.context().clearCookies();
}
