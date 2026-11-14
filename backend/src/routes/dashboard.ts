import { Router } from 'express';
import { DashboardController } from '../controllers/dashboardController';
import { requireAuth } from '../middleware/auth';

export function createDashboardRouter(
  dashboardController: DashboardController
): Router {
  const router = Router();

  router.get('/summary', requireAuth, dashboardController.getSummary);

  return router;
}
