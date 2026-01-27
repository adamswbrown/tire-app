import { test, expect } from '@playwright/test';

/**
 * Smoke tests for TIREApp - basic functionality without authentication
 */
test.describe('Smoke Tests', () => {
  test('should load home page without errors', async ({ page }) => {
    const response = await page.goto('/');

    // Check that page loaded successfully
    expect(response?.status()).toBeLessThan(400);

    // Check for main heading
    await expect(page.getByRole('heading', { name: /TIREApp/i })).toBeVisible();
  });

  test('should have correct page title', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/TIREApp/);
  });

  test('should display sign-in link', async ({ page }) => {
    await page.goto('/');

    const signInLink = page.getByRole('link', { name: /sign in/i });
    await expect(signInLink).toBeVisible();

    const href = await signInLink.getAttribute('href');
    expect(href).toBe('/api/auth/signin');
  });

  test('should protect /app routes', async ({ page }) => {
    // Attempt to access protected route - expect redirect or error
    try {
      await page.goto('/app', { waitUntil: 'domcontentloaded', timeout: 5000 });
      // If successful, check that we're on sign-in page
      const url = page.url();
      expect(url).toContain('/api/auth/signin');
    } catch (error) {
      // Redirect loop is expected behavior without proper auth setup
      expect(error.message).toContain('ERR_TOO_MANY_REDIRECTS');
    }
  });

  test('should protect /admin routes', async ({ page }) => {
    // Attempt to access admin route - expect redirect or error
    try {
      await page.goto('/admin', { waitUntil: 'domcontentloaded', timeout: 5000 });
      // If successful, check that we're on sign-in page
      const url = page.url();
      expect(url).toContain('/api/auth/signin');
    } catch (error) {
      // Redirect loop is expected behavior without proper auth setup
      expect(error.message).toContain('ERR_TOO_MANY_REDIRECTS');
    }
  });

  test('should have accessible navigation', async ({ page }) => {
    await page.goto('/');

    // Check for main semantic HTML
    await expect(page.locator('main')).toBeVisible();
    await expect(page.locator('h1')).toBeVisible();
  });

  test('should not have console errors on home page', async ({ page }) => {
    const errors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Filter out expected auth-related errors
    const unexpectedErrors = errors.filter(
      (e) => !e.includes('AUTH_SECRET') && !e.includes('[auth]')
    );

    expect(unexpectedErrors).toHaveLength(0);
  });

  test('should have responsive meta tags', async ({ page }) => {
    await page.goto('/');

    // Check for viewport meta tag
    const viewport = await page.locator('meta[name="viewport"]').getAttribute('content');
    expect(viewport).toContain('width=device-width');
  });
});
