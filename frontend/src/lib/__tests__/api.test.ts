import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  api,
  setCsrfToken,
  setUnauthorizedHandler,
  ApiError,
} from '../api';

describe('API Client', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    setCsrfToken(null);
    setUnauthorizedHandler(null);
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('GET requests do not attach X-CSRF-Token', async () => {
    setCsrfToken('dummy-csrf-token');
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ status: 'ok' }),
    });
    global.fetch = mockFetch;

    await api.get('/health');

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const headers = mockFetch.mock.calls[0][1].headers as Headers;
    expect(headers.get('X-CSRF-Token')).toBeNull();
  });

  it('mutations attach X-CSRF-Token and fetch one if not cached', async () => {
    const mockFetch = vi
      .fn()
      // First call: GET /api/auth/csrf
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ csrfToken: 'fetched-csrf-token' }),
      })
      // Second call: POST /api/projects
      .mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({ id: 'p1' }),
      });
    global.fetch = mockFetch;

    const res = await api.post('/projects', { title: 'Test Project' });

    expect(res).toEqual({ id: 'p1' });
    expect(mockFetch).toHaveBeenCalledTimes(2);

    // First call was to /api/auth/csrf
    expect(mockFetch.mock.calls[0][0]).toBe('/api/auth/csrf');

    // Second call had X-CSRF-Token
    const headers = mockFetch.mock.calls[1][1].headers as Headers;
    expect(headers.get('X-CSRF-Token')).toBe('fetched-csrf-token');
    expect(headers.get('Content-Type')).toBe('application/json');
  });

  it('refetches token and retries once on 403 CSRF_INVALID', async () => {
    setCsrfToken('stale-token');

    const mockFetch = vi
      .fn()
      // 1. Initial POST returns 403 CSRF_INVALID
      .mockResolvedValueOnce({
        ok: false,
        status: 403,
        clone: () => ({
          json: async () => ({ error: { code: 'CSRF_INVALID', message: 'CSRF token invalid' } }),
        }),
        json: async () => ({ error: { code: 'CSRF_INVALID', message: 'CSRF token invalid' } }),
      })
      // 2. Fetch fresh CSRF token
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ csrfToken: 'new-fresh-token' }),
      })
      // 3. Retried POST succeeds
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: true }),
      });
    global.fetch = mockFetch;

    const res = await api.post<{ success: boolean }>('/projects/1/submit');

    expect(res).toEqual({ success: true });
    expect(mockFetch).toHaveBeenCalledTimes(3);

    // Initial attempt used stale token
    expect((mockFetch.mock.calls[0][1].headers as Headers).get('X-CSRF-Token')).toBe('stale-token');
    // Refresh call
    expect(mockFetch.mock.calls[1][0]).toBe('/api/auth/csrf');
    // Retry used fresh token
    expect((mockFetch.mock.calls[2][1].headers as Headers).get('X-CSRF-Token')).toBe('new-fresh-token');
  });

  it('fails after one retry if 403 CSRF_INVALID persists', async () => {
    setCsrfToken('stale-token');

    const mockFetch = vi
      .fn()
      // 1. Initial attempt fails
      .mockResolvedValueOnce({
        ok: false,
        status: 403,
        clone: () => ({
          json: async () => ({ error: { code: 'CSRF_INVALID', message: 'CSRF invalid 1' } }),
        }),
        json: async () => ({ error: { code: 'CSRF_INVALID', message: 'CSRF invalid 1' } }),
      })
      // 2. Fetch fresh token
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ csrfToken: 'fresh-token' }),
      })
      // 3. Retry also fails
      .mockResolvedValueOnce({
        ok: false,
        status: 403,
        clone: () => ({
          json: async () => ({ error: { code: 'CSRF_INVALID', message: 'CSRF invalid 2' } }),
        }),
        json: async () => ({ error: { code: 'CSRF_INVALID', message: 'CSRF invalid 2' } }),
      });
    global.fetch = mockFetch;

    await expect(api.post('/projects/1/submit')).rejects.toThrow(ApiError);
    expect(mockFetch).toHaveBeenCalledTimes(3); // Initial + Refresh + 1 Retry, then stops
  });

  it('on 401 triggers unauthorized handler (clears auth state) for non-login requests', async () => {
    const onUnauthorized = vi.fn();
    setUnauthorizedHandler(onUnauthorized);

    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: { code: 'UNAUTHENTICATED', message: 'Session expired' } }),
    });
    global.fetch = mockFetch;

    await expect(api.get('/projects')).rejects.toThrow(ApiError);
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it('on 401 does NOT trigger unauthorized handler for login requests', async () => {
    const onUnauthorized = vi.fn();
    setUnauthorizedHandler(onUnauthorized);

    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: { code: 'UNAUTHENTICATED', message: 'Invalid email or password' } }),
    });
    global.fetch = mockFetch;

    await expect(api.post('/auth/login', { email: 'bad@demo.test', password: 'wrong' })).rejects.toThrow(ApiError);
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it('normalizes error responses and network failures into ApiError', async () => {
    setCsrfToken('valid-csrf-token');

    // 1. Structured API error
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 409,
      json: async () => ({
        error: { code: 'TEAM_FULL', message: 'Project team already has 3 members', details: { currentCount: 3 } },
      }),
    });

    try {
      await api.post('/projects/1/members', { studentId: 's1' });
      expect.fail('Should have thrown ApiError');
    } catch (err: any) {
      expect(err).toBeInstanceOf(ApiError);
      expect(err.status).toBe(409);
      expect(err.code).toBe('TEAM_FULL');
      expect(err.message).toBe('Project team already has 3 members');
      expect(err.details).toEqual({ currentCount: 3 });
    }

    // 2. Network failure
    global.fetch = vi.fn().mockRejectedValueOnce(new TypeError('Failed to fetch'));

    try {
      await api.get('/projects');
      expect.fail('Should have thrown ApiError');
    } catch (err: any) {
      expect(err).toBeInstanceOf(ApiError);
      expect(err.status).toBe(0);
      expect(err.code).toBe('NETWORK_ERROR');
      expect(err.message).toContain('Unable to reach the server');
    }
  });
});
