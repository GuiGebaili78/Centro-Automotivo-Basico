import { defineConfig, devices } from '@playwright/test';

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',


  use: {
    baseURL: 'http://localhost:5174',
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: [
    {
      command: 'npx tsx src/server.ts',
      cwd: './server',
      port: 3001,
      env: {
        DATABASE_URL: 'postgresql://user:password@localhost:5434/automotivo_test_db',
        PORT: '3001'
      },
      stdout: 'pipe',
      stderr: 'pipe',
      timeout: 120 * 1000,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'npx vite --port 5174',
      cwd: './client',
      port: 5174,
      env: {
        VITE_API_URL: 'http://localhost:3001/api',
        VITE_PORT: '5174'
      },
      stdout: 'pipe',
      stderr: 'pipe',
      timeout: 120 * 1000,
      reuseExistingServer: !process.env.CI,
    }
  ],
});
