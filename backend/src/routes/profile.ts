import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { requireAuth } from '../middleware/auth';
import { RateLimiters } from '../middleware/rateLimiter';

export function createProfileRouter(
  authController: AuthController,
  rateLimiters: RateLimiters
): Router {
  const router = Router();

  router.patch('/', requireAuth, authController.updateProfile);
  router.post(
    '/password',
    requireAuth,
    rateLimiters.passwordChange,
    authController.changePassword
  );

  return router;
}
