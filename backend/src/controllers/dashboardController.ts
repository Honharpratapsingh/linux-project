import { Request, Response, NextFunction } from 'express';
import { DashboardService } from '../services/dashboardService';
import { unauthenticated } from '../utils/errors';

export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  getSummary = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) return next(unauthenticated());
      const summary = await this.dashboardService.getSummary(req.user);
      res.status(200).json(summary);
    } catch (err) {
      next(err);
    }
  };
}
