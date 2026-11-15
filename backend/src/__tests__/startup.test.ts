import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { waitForDb, startServer } from '../server';
import { Pool } from 'pg';
import * as migrateModule from '../db/migrate';
import app from '../app';

describe('server startup — DB retry logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    delete process.env.RUN_MIGRATIONS_ON_START;
  });

  it('logs success and connects when DB succeeds on first attempt', async () => {
    const mockRelease = vi.fn();
    const mockPool = {
      connect: vi.fn().mockResolvedValue({ release: mockRelease }),
    } as unknown as Pool;

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await waitForDb(mockPool, 30, 0);

    expect(mockPool.connect).toHaveBeenCalledTimes(1);
    expect(mockRelease).toHaveBeenCalledTimes(1);
    expect(consoleSpy).toHaveBeenCalledWith('[server] DB connection established');

    consoleSpy.mockRestore();
  });

  it('retries on failure and logs attempt messages, then succeeds', async () => {
    const mockRelease = vi.fn();
    const mockConnect = vi
      .fn()
      .mockRejectedValueOnce(new Error('ECONNREFUSED'))
      .mockRejectedValueOnce(new Error('ECONNREFUSED'))
      .mockResolvedValueOnce({ release: mockRelease });

    const mockPool = { connect: mockConnect } as unknown as Pool;

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await waitForDb(mockPool, 3, 0);

    expect(mockConnect).toHaveBeenCalledTimes(3);
    expect(consoleSpy).toHaveBeenCalledWith(
      '[server] DB not ready (attempt 1/3): ECONNREFUSED'
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      '[server] DB not ready (attempt 2/3): ECONNREFUSED'
    );
    expect(consoleSpy).toHaveBeenCalledWith('[server] DB connection established');

    consoleSpy.mockRestore();
  });

  it('exits after max consecutive failures', async () => {
    const mockConnect = vi.fn().mockRejectedValue(new Error('timeout'));
    const mockPool = { connect: mockConnect } as unknown as Pool;

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const exitSpy = vi
      .spyOn(process, 'exit')
      .mockImplementation((_code?: string | number | null) => {
        throw new Error('process.exit called');
      });

    await expect(waitForDb(mockPool, 3, 0)).rejects.toThrow('process.exit called');

    expect(mockConnect).toHaveBeenCalledTimes(3);
    expect(consoleSpy).toHaveBeenCalledWith(
      '[server] Could not connect to DB after 3 attempts, exiting'
    );

    consoleSpy.mockRestore();
    exitSpy.mockRestore();
  });
});

describe('server startup — RUN_MIGRATIONS_ON_START', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    delete process.env.RUN_MIGRATIONS_ON_START;
  });

  it('does NOT call runMigrations when RUN_MIGRATIONS_ON_START is false or unset', async () => {
    const mockRelease = vi.fn();
    const mockPool = {
      connect: vi.fn().mockResolvedValue({ release: mockRelease }),
      end: vi.fn().mockResolvedValue(undefined),
    } as unknown as Pool;

    const mockServer = {
      close: vi.fn((cb?: () => void) => cb && cb()),
    };
    const listenSpy = vi.spyOn(app, 'listen').mockImplementation((...args: any[]) => {
      const cb = args[args.length - 1];
      if (typeof cb === 'function') cb();
      return mockServer as any;
    });

    const migrateSpy = vi
      .spyOn(migrateModule, 'runMigrations')
      .mockResolvedValue(undefined);

    await startServer(mockPool);

    expect(migrateSpy).not.toHaveBeenCalled();
    listenSpy.mockRestore();
    migrateSpy.mockRestore();
  });

  it('calls runMigrations when RUN_MIGRATIONS_ON_START=true', async () => {
    process.env.RUN_MIGRATIONS_ON_START = 'true';
    const mockRelease = vi.fn();
    const mockPool = {
      connect: vi.fn().mockResolvedValue({ release: mockRelease }),
      end: vi.fn().mockResolvedValue(undefined),
    } as unknown as Pool;

    const mockServer = {
      close: vi.fn((cb?: () => void) => cb && cb()),
    };
    const listenSpy = vi.spyOn(app, 'listen').mockImplementation((...args: any[]) => {
      const cb = args[args.length - 1];
      if (typeof cb === 'function') cb();
      return mockServer as any;
    });

    const migrateSpy = vi
      .spyOn(migrateModule, 'runMigrations')
      .mockResolvedValue(undefined);

    await startServer(mockPool);

    expect(migrateSpy).toHaveBeenCalledWith(mockPool);
    listenSpy.mockRestore();
    migrateSpy.mockRestore();
  });

  it('exits when runMigrations throws', async () => {
    process.env.RUN_MIGRATIONS_ON_START = 'true';
    const mockRelease = vi.fn();
    const mockPool = {
      connect: vi.fn().mockResolvedValue({ release: mockRelease }),
      end: vi.fn().mockResolvedValue(undefined),
    } as unknown as Pool;

    const migrateSpy = vi
      .spyOn(migrateModule, 'runMigrations')
      .mockRejectedValue(new Error('migration failed'));

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const exitSpy = vi
      .spyOn(process, 'exit')
      .mockImplementation((_code?: string | number | null) => {
        throw new Error('process.exit called');
      });

    await expect(startServer(mockPool)).rejects.toThrow('process.exit called');

    expect(consoleSpy).toHaveBeenCalledWith(
      '[server] Migration failed:',
      'migration failed'
    );

    consoleSpy.mockRestore();
    exitSpy.mockRestore();
    migrateSpy.mockRestore();
  });
});

describe('server startup — HOST bind address', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.HOST;
  });

  afterEach(() => {
    delete process.env.HOST;
  });

  it('defaults bind host to 127.0.0.1 when process.env.HOST is not set', async () => {
    delete process.env.HOST;
    const mockRelease = vi.fn();
    const mockPool = {
      connect: vi.fn().mockResolvedValue({ release: mockRelease }),
      end: vi.fn().mockResolvedValue(undefined),
    } as unknown as Pool;

    const mockServer = { close: vi.fn((cb?: () => void) => cb && cb()) };
    const listenSpy = vi.spyOn(app, 'listen').mockImplementation((...args: any[]) => {
      const cb = args[args.length - 1];
      if (typeof cb === 'function') cb();
      return mockServer as any;
    });

    await startServer(mockPool);

    expect(listenSpy).toHaveBeenCalledWith(
      expect.any(Number),
      '127.0.0.1',
      expect.any(Function)
    );
    listenSpy.mockRestore();
  });

  it('respects process.env.HOST when set (e.g. 0.0.0.0 in container)', async () => {
    process.env.HOST = '0.0.0.0';
    const mockRelease = vi.fn();
    const mockPool = {
      connect: vi.fn().mockResolvedValue({ release: mockRelease }),
      end: vi.fn().mockResolvedValue(undefined),
    } as unknown as Pool;

    const mockServer = { close: vi.fn((cb?: () => void) => cb && cb()) };
    const listenSpy = vi.spyOn(app, 'listen').mockImplementation((...args: any[]) => {
      const cb = args[args.length - 1];
      if (typeof cb === 'function') cb();
      return mockServer as any;
    });

    await startServer(mockPool);

    expect(listenSpy).toHaveBeenCalledWith(
      expect.any(Number),
      '0.0.0.0',
      expect.any(Function)
    );
    listenSpy.mockRestore();
  });
});
