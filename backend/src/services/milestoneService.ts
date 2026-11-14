import { Pool } from 'pg';
import { User, Milestone } from '../types';
import { MilestoneRepository } from '../repositories/milestoneRepository';
import { ProjectService } from './projectService';
import { withTransaction } from '../utils/transaction';
import { notFound, forbidden, projectArchived } from '../utils/errors';

export class MilestoneService {
  constructor(
    private pool: Pool,
    private projectService: ProjectService,
    private milestoneRepo: MilestoneRepository
  ) {}

  async listMilestones(user: User, projectId: string): Promise<Milestone[]> {
    await this.projectService.getProjectForUser(this.pool, projectId, user);
    return this.milestoneRepo.findByProjectId(this.pool, projectId);
  }

  async createMilestone(
    user: User,
    projectId: string,
    data: { title: string; description?: string | null; dueDate?: string | null }
  ): Promise<Milestone> {
    return withTransaction(this.pool, async (client) => {
      const { project, detail } = await this.projectService.getProjectForUser(
        client,
        projectId,
        user,
        true
      );

      if (project.archived_at) {
        throw projectArchived();
      }

      if (user.role === 'FACULTY') {
        throw forbidden('Faculty cannot create milestones');
      }

      if (!detail.permissions.canManageMilestones) {
        throw forbidden('Cannot manage milestones in current state');
      }

      return this.milestoneRepo.insert(client, {
        projectId,
        title: data.title,
        description: data.description,
        dueDate: data.dueDate,
      });
    });
  }

  async updateMilestone(
    user: User,
    projectId: string,
    milestoneId: string,
    data: {
      title?: string;
      description?: string | null;
      dueDate?: string | null;
      isCompleted?: boolean;
    }
  ): Promise<Milestone> {
    return withTransaction(this.pool, async (client) => {
      const { project, detail } = await this.projectService.getProjectForUser(
        client,
        projectId,
        user,
        true
      );

      if (project.archived_at) {
        throw projectArchived();
      }

      if (user.role === 'FACULTY') {
        throw forbidden('Faculty cannot update milestones');
      }

      if (!detail.permissions.canManageMilestones) {
        throw forbidden('Cannot manage milestones in current state');
      }

      const existing = await this.milestoneRepo.findById(client, milestoneId);
      if (!existing || existing.project_id !== projectId) {
        throw notFound('Milestone not found in this project');
      }

      const updated = await this.milestoneRepo.update(client, milestoneId, data);
      if (!updated) {
        throw notFound('Milestone not found');
      }
      return updated;
    });
  }

  async deleteMilestone(
    user: User,
    projectId: string,
    milestoneId: string
  ): Promise<void> {
    return withTransaction(this.pool, async (client) => {
      const { project, detail } = await this.projectService.getProjectForUser(
        client,
        projectId,
        user,
        true
      );

      if (project.archived_at) {
        throw projectArchived();
      }

      if (user.role === 'FACULTY') {
        throw forbidden('Faculty cannot delete milestones');
      }

      if (!detail.permissions.canManageMilestones) {
        throw forbidden('Cannot manage milestones in current state');
      }

      const existing = await this.milestoneRepo.findById(client, milestoneId);
      if (!existing || existing.project_id !== projectId) {
        throw notFound('Milestone not found in this project');
      }

      await this.milestoneRepo.delete(client, milestoneId);
    });
  }
}
