import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../types';
import { unauthenticated, forbidden } from '../utils/errors';

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) {
    return next(unauthenticated('Authentication required'));
  }
  next();
}

export function requireRole(role: UserRole) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(unauthenticated('Authentication required'));
    }
    if (req.user.role !== role) {
      return next(forbidden(`Access restricted to ${role} role`));
    }
    next();
  };
}
