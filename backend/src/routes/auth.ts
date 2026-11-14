import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { RateLimiters } from '../middleware/rateLimiter';

export function createAuthRouter(
  authController: AuthController,
  rateLimiters: RateLimiters
): Router {
  const router = Router();

  router.get('/csrf', authController.getCsrf);
  router.post('/register', rateLimiters.register, authController.register);
  router.post(
    '/login',
    rateLimiters.loginLoose,
    rateLimiters.loginStrict,
    authController.login
  );
  router.post('/logout', authController.logout);
  router.get('/me', authController.getMe);

  return router;
}
