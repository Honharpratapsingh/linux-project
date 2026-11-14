import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { requireAuth, requireRole } from '../middleware/auth';
import { RateLimiters } from '../middleware/rateLimiter';

export function createDirectoryRouter(
  authController: AuthController,
  rateLimiters: RateLimiters
): Router {
  const router = Router();

  router.get('/faculty', requireAuth, authController.getFaculty);
  router.get(
    '/students/search',
    requireAuth,
    requireRole('STUDENT'),
    rateLimiters.studentSearch,
    authController.searchStudents
  );

  return router;
}
