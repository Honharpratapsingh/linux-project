import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/errors';

export function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // 1. Zod validation errors
  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: err.issues,
      },
    });
    return;
  }

  // 2. Body-parser JSON syntax errors
  if (err instanceof SyntaxError && 'status' in err && (err as any).status === 400) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid JSON payload',
      },
    });
    return;
  }

  // 3. Known AppErrors
  if (err instanceof AppError || (err?.statusCode && err?.code)) {
    const payload: { error: { code: string; message: string; details?: any } } = {
      error: {
        code: err.code,
        message: err.message,
      },
    };
    if (err.details) {
      payload.error.details = err.details;
    }
    res.status(err.statusCode).json(payload);
    return;
  }

  // 4. PostgreSQL errors
  if (err && typeof err === 'object' && 'code' in err) {
    // Unique violation
    if (err.code === '23505') {
      const detail = String(err.detail || '');
      if (detail.includes('lower(email)') || detail.includes('users_email_key')) {
        res.status(409).json({
          error: {
            code: 'EMAIL_TAKEN',
            message: 'Email already taken',
          },
        });
        return;
      }
      res.status(409).json({
        error: {
          code: 'CONFLICT',
          message: 'Conflict with existing resource',
        },
      });
      return;
    }

    // Check constraint violation
    if (err.code === '23514') {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Constraint violation',
        },
      });
      return;
    }

    // Foreign key violation
    if (err.code === '23503') {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Referenced entity not found',
        },
      });
      return;
    }
  }

  // 5. Default 500 INTERNAL
  res.status(500).json({
    error: {
      code: 'INTERNAL',
      message: 'An unexpected internal error occurred',
    },
  });
}
