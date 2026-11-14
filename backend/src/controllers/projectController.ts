import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ProjectService } from '../services/projectService';
import { unauthenticated } from '../utils/errors';

const createProjectSchema = z
  .object({
    title: z.string().trim().min(3).max(120),
    description: z.string().trim().min(0).max(5000),
    guideId: z.string().uuid(),
  })
  .strict();

const updateProjectSchema = z
  .object({
    title: z.string().trim().min(3).max(120).optional(),
    description: z.string().trim().min(0).max(5000).optional(),
    guideId: z.string().uuid().optional(),
  })
  .strict()
  .refine(
    (d) =>
      d.title !== undefined || d.description !== undefined || d.guideId !== undefined,
    { message: 'At least one field must be provided' }
  );

const approveSchema = z
  .object({
    message: z.string().trim().max(2000).optional(),
  })
  .strict();

const rejectSchema = z
  .object({
    message: z.string().trim().min(1).max(2000),
  })
  .strict();

const requestChangesSchema = z
  .object({
    message: z.string().trim().min(1).max(2000),
  })
  .strict();

const completeSchema = z
  .object({
    message: z.string().trim().max(2000).optional(),
  })
  .strict();

const listQuerySchema = z.object({
  status: z
    .enum([
      'DRAFT',
      'PENDING_REVIEW',
      'CHANGES_REQUESTED',
      'REJECTED',
      'IN_PROGRESS',
      'COMPLETED',
    ])
    .optional(),
  guide: z.string().optional(),
  search: z.string().optional(),
  archived: z.enum(['true', 'false']).default('false'),
  assigned: z.literal('me').optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.enum(['updatedAt', 'createdAt', 'title', 'status']).default('updatedAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export class ProjectController {
  constructor(private projectService: ProjectService) {}

  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) return next(unauthenticated());
      const query = listQuerySchema.parse(req.query);

      const result = await this.projectService.listProjects(req.user, {
        status: query.status,
        guide: query.guide,
        search: query.search,
        archived: query.archived === 'true',
        assignedMe: query.assigned === 'me',
        page: query.page,
        pageSize: query.pageSize,
        sort: query.sort,
        order: query.order,
      });

      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) return next(unauthenticated());
      const body = createProjectSchema.parse(req.body);
      const detail = await this.projectService.createProject(req.user, body);
      res.status(201).json(detail);
    } catch (err) {
      next(err);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) return next(unauthenticated());
      const lookup = await this.projectService.getProjectForUser(
        (this.projectService as any).pool,
        req.params.id,
        req.user
      );
      res.status(200).json(lookup.detail);
    } catch (err) {
      next(err);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) return next(unauthenticated());
      const body = updateProjectSchema.parse(req.body);
      const detail = await this.projectService.updateProject(
        req.user,
        req.params.id,
        body
      );
      res.status(200).json(detail);
    } catch (err) {
      next(err);
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) return next(unauthenticated());
      await this.projectService.deleteProject(req.user, req.params.id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  };

  getHistory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) return next(unauthenticated());
      const items = await this.projectService.getHistory(req.user, req.params.id);
      res.status(200).json({ items });
    } catch (err) {
      next(err);
    }
  };

  submit = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) return next(unauthenticated());
      const detail = await this.projectService.submitProject(req.user, req.params.id);
      res.status(200).json(detail);
    } catch (err) {
      next(err);
    }
  };

  approve = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) return next(unauthenticated());
      const body = approveSchema.parse(req.body);
      const detail = await this.projectService.approveProject(
        req.user,
        req.params.id,
        body.message
      );
      res.status(200).json(detail);
    } catch (err) {
      next(err);
    }
  };

  requestChanges = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) return next(unauthenticated());
      const body = requestChangesSchema.parse(req.body);
      const detail = await this.projectService.requestChangesProject(
        req.user,
        req.params.id,
        body.message
      );
      res.status(200).json(detail);
    } catch (err) {
      next(err);
    }
  };

  reject = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) return next(unauthenticated());
      const body = rejectSchema.parse(req.body);
      const detail = await this.projectService.rejectProject(
        req.user,
        req.params.id,
        body.message
      );
      res.status(200).json(detail);
    } catch (err) {
      next(err);
    }
  };

  complete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) return next(unauthenticated());
      const body = completeSchema.parse(req.body);
      const detail = await this.projectService.completeProject(
        req.user,
        req.params.id,
        body.message
      );
      res.status(200).json(detail);
    } catch (err) {
      next(err);
    }
  };

  archive = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) return next(unauthenticated());
      const detail = await this.projectService.archiveProject(req.user, req.params.id);
      res.status(200).json(detail);
    } catch (err) {
      next(err);
    }
  };

  restore = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) return next(unauthenticated());
      const detail = await this.projectService.restoreProject(req.user, req.params.id);
      res.status(200).json(detail);
    } catch (err) {
      next(err);
    }
  };
}
