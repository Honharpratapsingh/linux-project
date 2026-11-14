import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync } from 'child_process';
import path from 'path';
import http from 'http';

describe('Dev Port 5001 and Vite Proxy Verification', () => {
  let backendServer: http.Server;
  let viteServer: any;

  beforeAll(async () => {
    process.env.SESSION_SECRET =
      process.env.SESSION_SECRET || 'a'.repeat(32);
    process.env.PORT = '5001';

    // Import app and pool
    const { default: app } = await import('../app');

    // 1. Start backend server on port 5001
    await new Promise<void>((resolve) => {
      backendServer = app.listen(5001, '127.0.0.1', () => {
        resolve();
      });
    });

    // 2. Start Vite server on port 5173 with proxy
    const vitePath = require.resolve('vite', {
      paths: [path.resolve(__dirname, '../../../frontend')],
    });
    const { createServer: createViteServer } = await import(vitePath);
    const frontendDir = path.resolve(__dirname, '../../../frontend');
    viteServer = await createViteServer({
      root: frontendDir,
      server: {
        port: 5173,
        strictPort: true,
        proxy: {
          '/api': {
            target: process.env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:5001',
            changeOrigin: true,
          },
        },
      },
    });
    await viteServer.listen();
  });

  afterAll(async () => {
    if (viteServer) await viteServer.close();
    if (backendServer) {
      await new Promise<void>((resolve) => backendServer.close(() => resolve()));
    }
  });

  it('curl -i http://127.0.0.1:5001/api/health', () => {
    const output = execSync('curl -i http://127.0.0.1:5001/api/health', {
      encoding: 'utf8',
    });
    console.log('\n--- BACKEND 5001 PROOF ---\n' + output);
    expect(output).toContain('HTTP/1.1 200 OK');
    expect(output).toContain('{"status":"ok","db":"up"}');
  });

  it('curl -i http://localhost:5173/api/health', () => {
    const output = execSync('curl -i http://localhost:5173/api/health', {
      encoding: 'utf8',
    });
    console.log('\n--- FRONTEND PROXY 5173 PROOF ---\n' + output);
    expect(output).toContain('HTTP/1.1 200 OK');
    expect(output).toContain('{"status":"ok","db":"up"}');
  });
});
