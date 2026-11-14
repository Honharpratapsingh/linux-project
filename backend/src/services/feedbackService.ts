import { Pool } from 'pg';
import { User, Feedback } from '../types';
import { FeedbackRepository } from '../repositories/feedbackRepository';
import { ProjectService } from './projectService';
import { withTransaction } from '../utils/transaction';
import { forbidden, projectArchived } from '../utils/errors';

export class FeedbackService {
  constructor(
    private pool: Pool,
    private projectService: ProjectService,
    private feedbackRepo: FeedbackRepository
  ) {}

  async listFeedback(user: User, projectId: string): Promise<Feedback[]> {
    await this.projectService.getProjectForUser(this.pool, projectId, user);
    return this.feedbackRepo.findByProjectId(this.pool, projectId);
  }

  async giveFeedback(
    user: User,
    projectId: string,
    message: string
  ): Promise<Feedback> {
    return withTransaction(this.pool, async (client) => {
      const { project, detail, relation } =
        await this.projectService.getProjectForUser(client, projectId, user, true);

      if (project.archived_at) {
        throw projectArchived();
      }

      if (user.role === 'STUDENT' || !relation.isGuide) {
        throw forbidden('Only the assigned faculty guide can give feedback');
      }

      return this.feedbackRepo.insert(client, {
        projectId,
        facultyId: user.id,
        message,
        feedbackType: 'COMMENT',
      });
    });
  }
}
