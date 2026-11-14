import { Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';
import { csrfInvalid, validationError } from '../utils/errors';
import { verifyCsrfToken } from '../utils/crypto';

export function securityHeadersMiddleware(
  _req: Request,
  res: Response,
  next: NextFunction
): void {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  next();
}

export function csrfProtectionMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  // Safe HTTP methods do not require CSRF token
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // 1. Check Origin header if present
  const originHeader = req.headers['origin'];
  if (originHeader && typeof originHeader === 'string') {
    const allowed = req.appConfig.ALLOWED_ORIGINS
      ? req.appConfig.ALLOWED_ORIGINS.split(',').map((s) => s.trim().toLowerCase())
      : [];
    if (!allowed.includes(originHeader.trim().toLowerCase())) {
      return next(csrfInvalid('Origin not allowed'));
    }
  }

  // 2. Check X-CSRF-Token header against session csrfToken
  const tokenHeader = (req.headers['x-csrf-token'] as string) || '';
  const sessionToken = req.session?.csrfToken;

  if (!verifyCsrfToken(tokenHeader, sessionToken)) {
    return next(csrfInvalid('Invalid or missing CSRF token'));
  }

  next();
}

export function createUserLoaderMiddleware(pool: Pool) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.session?.userId) {
      req.user = undefined;
      return next();
    }

    try {
      const result = await pool.query(
        'SELECT id, full_name, email, role, registration_number, created_at FROM users WHERE id = $1',
        [req.session.userId]
      );

      if (result.rows.length === 0) {
        // User no longer exists in DB — destroy session
        req.session.destroy(() => {
          res.clearCookie('projecthub.sid');
          req.user = undefined;
          next();
        });
        return;
      }

      const row = result.rows[0];
      req.user = {
        id: row.id,
        fullName: row.full_name,
        email: row.email,
        role: row.role,
        registrationNumber: row.registration_number,
        createdAt:
          row.created_at instanceof Date
            ? row.created_at.toISOString()
            : new Date(row.created_at).toISOString(),
      };
      next();
    } catch (err) {
      next(err);
    }
  };
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function validateUuidParam(paramName: string) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const val = req.params[paramName];
    if (!val || !UUID_REGEX.test(val)) {
      return next(
        validationError(`Invalid ${paramName} parameter: must be a valid UUID`)
      );
    }
    next();
  };
}
