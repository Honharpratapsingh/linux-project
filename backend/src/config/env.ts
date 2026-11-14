import fs from 'fs';
import path from 'path';
import { z } from 'zod';

function loadDotenv() {
  const envPath = path.resolve(__dirname, '../../../.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let val = (match[2] || '').trim();
        if (
          (val.startsWith('"') && val.endsWith('"')) ||
          (val.startsWith("'") && val.endsWith("'"))
        ) {
          val = val.slice(1, -1);
        }
        if (process.env[key] === undefined) {
          process.env[key] = val;
        }
      }
    }
  }
}

loadDotenv();

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
  // Optional rate-limit overrides for testing
  RATE_LIMIT_LOGIN_STRICT_MAX?: number;
  RATE_LIMIT_LOGIN_LOOSE_MAX?: number;
  RATE_LIMIT_REGISTER_MAX?: number;
  RATE_LIMIT_STUDENT_SEARCH_MAX?: number;
  RATE_LIMIT_PASSWORD_MAX?: number;
};

function loadEnv(): AppConfig {
  const isProd = process.env.NODE_ENV === 'production';
  const isTest = process.env.NODE_ENV === 'test';

  const databaseUrl =
    process.env.DATABASE_URL || (isTest ? process.env.TEST_DATABASE_URL : undefined);

  const sessionSecret =
    process.env.SESSION_SECRET ||
    (!isProd ? 'development-session-secret-must-be-at-least-32-chars-long' : undefined);

  const raw = {
    ...process.env,
    ...(databaseUrl ? { DATABASE_URL: databaseUrl } : {}),
    ...(sessionSecret ? { SESSION_SECRET: sessionSecret } : {}),
  };

  const result = envSchema.safeParse(raw);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    const msg = `[config] Invalid environment variables:\n${issues}`;
    if (isTest) {
      throw new Error(msg);
    }
    console.error(msg);
    process.exit(1);
  }
  return result.data;
}

export const env = loadEnv();
export type Env = typeof env;
