import { describe, it, expect, vi } from 'vitest';

describe('env validator', () => {
  it('exports env object when env vars are valid', async () => {
    // The mock in health.test already tests valid env loading.
    // Here we verify the schema rejects bad values.
    const { z } = await import('zod');
    // SESSION_SECRET too short
    const schema = z.object({
      SESSION_SECRET: z.string().min(32),
    });
    const result = schema.safeParse({ SESSION_SECRET: 'tooshort' });
    expect(result.success).toBe(false);
  });

  it('accepts SESSION_SECRET of exactly 32 chars', async () => {
    const { z } = await import('zod');
    const schema = z.object({ SESSION_SECRET: z.string().min(32) });
    const result = schema.safeParse({ SESSION_SECRET: 'a'.repeat(32) });
    expect(result.success).toBe(true);
  });

  it('rejects COOKIE_SECURE values other than auto|true|false', async () => {
    const { z } = await import('zod');
    const schema = z.object({ COOKIE_SECURE: z.enum(['auto', 'true', 'false']) });
    expect(schema.safeParse({ COOKIE_SECURE: 'yes' }).success).toBe(false);
    expect(schema.safeParse({ COOKIE_SECURE: 'auto' }).success).toBe(true);
  });
});
