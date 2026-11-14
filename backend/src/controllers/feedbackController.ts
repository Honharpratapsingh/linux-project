import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { FeedbackService } from '../services/feedbackService';
import { unauthenticated } from '../utils/errors';

const createFeedbackSchema = z
  .object({
    message: z.string().trim().min(1).max(2000),
  })
  .strict();

export class FeedbackController {
  constructor(private feedbackService: FeedbackService) {}

  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) return next(unauthenticated());
      const items = await this.feedbackService.listFeedback(
        req.user,
        req.params.id
      );
      res.status(200).json({ items });
    } catch (err) {
      next(err);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) return next(unauthenticated());
      const body = createFeedbackSchema.parse(req.body);
      const feedback = await this.feedbackService.giveFeedback(
        req.user,
        req.params.id,
        body.message
      );
      res.status(201).json(feedback);
    } catch (err) {
      next(err);
    }
  };
}
