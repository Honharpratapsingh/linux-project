import { defineConfig, devices } from '@playwright/test';
import crypto from 'crypto';
import path from 'path';

const rootDir = path.resolve(__dirname, '..');
const sessionSecret = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
const dbUrl = process.env.E2E_DATABASE_URL || 'postgresql://projecthub:projecthub@localhost:5432/projecthub_e2e';
const e2eBaseUrl = process.env.E2E_BASE_URL;

export default defineConfig({
  testDir: './tests',
  outputDir: './test-results',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: e2eBaseUrl || 'http://localhost:5175',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  ...(e2eBaseUrl
    ? {}
    : {
        webServer: [
          {
            command: `DATABASE_URL="${dbUrl}" PORT=5002 SESSION_SECRET="${sessionSecret}" ALLOWED_ORIGINS="http://localhost:5175,http://127.0.0.1:5175" NODE_ENV=development npm run dev --workspace=backend`,
            cwd: rootDir,
            url: 'http://127.0.0.1:5002/api/health',
            reuseExistingServer: false,
            timeout: 30000,
          },
          {
            command: 'VITE_DEV_PORT=5175 VITE_API_PROXY_TARGET=http://127.0.0.1:5002 npm run dev --workspace=frontend',
            cwd: rootDir,
            url: 'http://localhost:5175',
            reuseExistingServer: false,
            timeout: 30000,
          },
        ],
      }),
});
