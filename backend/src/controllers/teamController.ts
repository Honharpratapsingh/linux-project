import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { TeamService } from '../services/teamService';
import { unauthenticated } from '../utils/errors';

const addMemberSchema = z
  .object({
    studentId: z.string().uuid(),
  })
  .strict();

export class TeamController {
  constructor(private teamService: TeamService) {}

  addMember = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) return next(unauthenticated());
      const body = addMemberSchema.parse(req.body);
      const detail = await this.teamService.addMember(
        req.user,
        req.params.id,
        body.studentId
      );
      res.status(201).json(detail);
    } catch (err) {
      next(err);
    }
  };

  removeMember = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) return next(unauthenticated());
      const detail = await this.teamService.removeMember(
        req.user,
        req.params.id,
        req.params.studentId
      );
      res.status(200).json(detail);
    } catch (err) {
      next(err);
    }
  };
}
