import app from './app';
import { env } from './config/env';
import { pool as defaultPool } from './db/pool';
import { runMigrations } from './db/migrate';
import { Pool } from 'pg';
import http from 'http';

const HOST = process.env.HOST || '127.0.0.1';

export const MAX_ATTEMPTS = 30;
export const RETRY_DELAY_MS = 2000;

export async function waitForDb(
  targetPool: Pool = defaultPool,
  maxAttempts: number = MAX_ATTEMPTS,
  delayMs: number = RETRY_DELAY_MS
): Promise<void> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const client = await targetPool.connect();
      client.release();
      console.log('[server] DB connection established');
      return;
    } catch (err) {
      console.log(
        `[server] DB not ready (attempt ${attempt}/${maxAttempts}): ${(err as Error).message}`
      );
      if (attempt < maxAttempts && delayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }
  console.log(`[server] Could not connect to DB after ${maxAttempts} attempts, exiting`);
  process.exit(1);
}

export async function startServer(targetPool: Pool = defaultPool): Promise<http.Server> {
  await waitForDb(targetPool);

  if (process.env.RUN_MIGRATIONS_ON_START === 'true') {
    try {
      await runMigrations(targetPool);
    } catch (err) {
      console.error('[server] Migration failed:', (err as Error).message);
      process.exit(1);
    }
  }

  const bindHost = process.env.HOST || '127.0.0.1';
  const server = app.listen(env.PORT, bindHost, () => {
    console.log(`[server] Backend listening on http://${bindHost}:${env.PORT} (${env.NODE_ENV})`);
  });

  function shutdown(signal: string) {
    console.log(`[server] ${signal} received — shutting down gracefully`);
    server.close(async () => {
      await targetPool.end();
      console.log('[server] Closed');
      process.exit(0);
    });
    // Force exit after 10s
    setTimeout(() => process.exit(1), 10_000).unref();
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  return server;
}

if (process.env.NODE_ENV !== 'test') {
  startServer();
}
