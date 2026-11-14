import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';

// Mock env BEFORE importing app
vi.mock('../config/env', () => ({
  env: {
    DATABASE_URL: 'postgresql://projecthub:projecthub@localhost:5432/projecthub_test',
    SESSION_SECRET: 'test-secret-that-is-at-least-32-characters-long',
    PORT: 5000,
    NODE_ENV: 'test',
    TRUST_PROXY_HOPS: 1,
    COOKIE_SECURE: 'auto',
  },
}));

// Mock the pool
vi.mock('../db/pool', () => ({
  pool: {
    query: vi.fn(),
  },
}));

import app from '../app';
import { pool } from '../db/pool';

describe('GET /api/health', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns 200 {status:"ok", db:"up"} when DB is reachable', async () => {
    vi.mocked(pool.query as any).mockResolvedValueOnce({ rows: [], rowCount: 1, command: 'SELECT', oid: 0, fields: [] });
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok', db: 'up' });
  });

  it('returns 503 {status:"error", db:"down"} when DB is unreachable', async () => {
    vi.mocked(pool.query as any).mockRejectedValueOnce(new Error('connection refused'));
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(503);
    expect(res.body).toEqual({ status: 'error', db: 'down' });
  });
});
