import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './e2e/editor', workers: 1, timeout: 45000,
  use: { baseURL: 'http://127.0.0.1:5182', trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop', use: { browserName: 'chromium', viewport: { width: 1440, height: 900 } } },
    { name: 'tablet', use: { browserName: 'chromium', viewport: { width: 768, height: 1024 } } },
    { name: 'mobile', use: { browserName: 'chromium', viewport: { width: 390, height: 844 } } },
  ],
  webServer: { command: 'npm run dev -- --host 127.0.0.1 --port 5182', url: 'http://127.0.0.1:5182', reuseExistingServer: false, timeout: 60000 },
});
