import { defineConfig, devices } from '@playwright/test';
import { config } from 'dotenv';
import path from 'path';

// Load test environment variables
config({ path: path.resolve(__dirname, '.env.test') });

/**
 * E2E testing configuration for TIREApp
 * See https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    env: {
      AUTH_SECRET: process.env.AUTH_SECRET || 'test-secret-for-e2e',
      AUTH_TRUST_HOST: 'true',
      DATABASE_URL: process.env.DATABASE_URL || '',
    },
  },
});
