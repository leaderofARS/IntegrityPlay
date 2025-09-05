import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests-e2e',
  use: {
    headless: true,
    baseURL: 'http://localhost:3000',
  },
  webServer: {
    command: 'echo "Assuming docker compose serves on :3000"',
    port: 3000,
    reuseExistingServer: true,
  },
});

