import { z } from 'zod';

const cookieSecureSchema = z.enum(['auto', 'true', 'false']).default('auto');

export const envSchema = z.object({
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid PostgreSQL URL'),
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 characters'),
  PORT: z.coerce.number().int().positive().default(5000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).default(1),
  COOKIE_SECURE: cookieSecureSchema,
  SESSION_TTL_HOURS: z.coerce.number().int().positive().default(8),
  BCRYPT_ROUNDS: z.coerce.number().int().min(4).max(16).default(12),
  ALLOWED_ORIGINS: z.string().default(
    'http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,http://127.0.0.1:3000'
  ),
});

export type AppConfig = {
  DATABASE_URL: string;
  SESSION_SECRET: string;
  PORT: number;
  NODE_ENV: 'development' | 'production' | 'test';
  TRUST_PROXY_HOPS: number;
  COOKIE_SECURE: 'auto' | 'true' | 'false';
  SESSION_TTL_HOURS: number;
  BCRYPT_ROUNDS: number;
  ALLOWED_ORIGINS: string;
  RATE_LIMIT_LOGIN_STRICT_MAX?: number;
  RATE_LIMIT_LOGIN_LOOSE_MAX?: number;
  RATE_LIMIT_REGISTER_MAX?: number;
  RATE_LIMIT_STUDENT_SEARCH_MAX?: number;
  RATE_LIMIT_PASSWORD_MAX?: number;
};

export function loadEnv(customEnv?: Record<string, string | undefined>): AppConfig {
  const envSource = customEnv || process.env;
  const isTest = envSource.NODE_ENV === 'test';

  // When NODE_ENV === 'test', test defaults apply.
  // In development and production, DATABASE_URL and SESSION_SECRET are strictly required with no defaults.
  const databaseUrl =
    envSource.DATABASE_URL || (isTest ? envSource.TEST_DATABASE_URL : undefined);

  const sessionSecret =
    envSource.SESSION_SECRET ||
    (isTest ? 'test-session-secret-must-be-at-least-32-chars-long' : undefined);

  const raw = {
    ...envSource,
    ...(databaseUrl ? { DATABASE_URL: databaseUrl } : {}),
    ...(sessionSecret ? { SESSION_SECRET: sessionSecret } : {}),
  };

  const result = envSchema.safeParse(raw);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    const msg = `[config] Invalid environment variables:\n${issues}`;
    if (isTest || customEnv) {
      throw new Error(msg);
    }
    console.error(msg);
    process.exit(1);
  }
  return result.data;
}

export const env = loadEnv();
export type Env = typeof env;
