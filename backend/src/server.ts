import app from './app';
import { env } from './config/env';
import { pool } from './db/pool';

const HOST = process.env.HOST || '127.0.0.1';

const server = app.listen(env.PORT, HOST, () => {
  console.log(`[server] Backend listening on http://${HOST}:${env.PORT} (${env.NODE_ENV})`);
});

function shutdown(signal: string) {
  console.log(`[server] ${signal} received — shutting down gracefully`);
  server.close(async () => {
    await pool.end();
    console.log('[server] Closed');
    process.exit(0);
  });
  // Force exit after 10s
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
