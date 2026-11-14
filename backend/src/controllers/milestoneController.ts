import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { MilestoneService } from '../services/milestoneService';
import { unauthenticated } from '../utils/errors';

const createMilestoneSchema = z
  .object({
    title: z.string().trim().min(1).max(120),
    description: z.string().trim().max(2000).optional().nullable(),
    dueDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'dueDate must be in format YYYY-MM-DD')
      .optional()
      .nullable(),
  })
  .strict();

const updateMilestoneSchema = z
  .object({
    title: z.string().trim().min(1).max(120).optional(),
    description: z.string().trim().max(2000).optional().nullable(),
    dueDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'dueDate must be in format YYYY-MM-DD')
      .optional()
      .nullable(),
    isCompleted: z.boolean().optional(),
  })
  .strict();

export class MilestoneController {
  constructor(private milestoneService: MilestoneService) {}

  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) return next(unauthenticated());
      const items = await this.milestoneService.listMilestones(
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
      const body = createMilestoneSchema.parse(req.body);
      const milestone = await this.milestoneService.createMilestone(
        req.user,
        req.params.id,
        body
      );
      res.status(201).json(milestone);
    } catch (err) {
      next(err);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) return next(unauthenticated());
      const body = updateMilestoneSchema.parse(req.body);
      const milestone = await this.milestoneService.updateMilestone(
        req.user,
        req.params.id,
        req.params.milestoneId,
        body
      );
      res.status(200).json(milestone);
    } catch (err) {
      next(err);
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) return next(unauthenticated());
      await this.milestoneService.deleteMilestone(
        req.user,
        req.params.id,
        req.params.milestoneId
      );
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  };
}
