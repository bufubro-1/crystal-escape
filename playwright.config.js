import { defineConfig } from '@playwright/test';

const port = 4173;
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: './tests/browser',
  reporter: 'list',
  workers: 2,
  use: { baseURL, browserName: 'chromium', trace: 'retain-on-failure' },
  webServer: { command: `node scripts/serve.js ${port}`, url: baseURL },
});
