import { Request, Response } from 'express';
import { rateLimit } from 'express-rate-limit';
import { AppConfig } from '../config/env';

export interface RateLimiters {
  loginStrict: ReturnType<typeof rateLimit>;
  loginLoose: ReturnType<typeof rateLimit>;
  register: ReturnType<typeof rateLimit>;
  studentSearch: ReturnType<typeof rateLimit>;
  passwordChange: ReturnType<typeof rateLimit>;
}

const standardRateLimitHandler = (_req: Request, res: Response): void => {
  res.status(429).json({
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many requests, please try again later',
    },
  });
};

export function createRateLimiters(config: AppConfig): RateLimiters {
  const loginStrict = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: config.RATE_LIMIT_LOGIN_STRICT_MAX ?? 5,
    skipSuccessfulRequests: true,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: Request) => {
      const email = String(req.body?.email || '')
        .toLowerCase()
        .trim();
      const ip = req.ip || '127.0.0.1';
      return `${ip}|${email}`;
    },
    handler: standardRateLimitHandler,
  });

  const loginLoose = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: config.RATE_LIMIT_LOGIN_LOOSE_MAX ?? 50,
    skipSuccessfulRequests: true,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: Request) => req.ip || '127.0.0.1',
    handler: standardRateLimitHandler,
  });

  const register = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: config.RATE_LIMIT_REGISTER_MAX ?? 10,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: Request) => req.ip || '127.0.0.1',
    handler: standardRateLimitHandler,
  });

  const studentSearch = rateLimit({
    windowMs: 60 * 1000,
    limit: config.RATE_LIMIT_STUDENT_SEARCH_MAX ?? 30,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: Request) => req.session?.userId || req.ip || '127.0.0.1',
    handler: standardRateLimitHandler,
  });

  const passwordChange = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: config.RATE_LIMIT_PASSWORD_MAX ?? 5,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: Request) => req.session?.userId || req.ip || '127.0.0.1',
    handler: standardRateLimitHandler,
  });

  return {
    loginStrict,
    loginLoose,
    register,
    studentSearch,
    passwordChange,
  };
}
