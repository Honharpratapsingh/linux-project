import { Pool, PoolClient } from 'pg';
import {
  User,
  ProjectDetail,
  ProjectSummary,
  ProjectStatus,
  HistoryEntry,
} from '../types';
import { ProjectRepository, RawProjectRow } from '../repositories/projectRepository';
import { UserRepository } from '../repositories/userRepository';
import {
  computePermissions,
  ProjectRelation,
  MilestoneStats,
} from './workflow';
import { withTransaction } from '../utils/transaction';
import {
  notFound,
  forbidden,
  validationError,
  invalidState,
  projectArchived,
  completionBlocked,
} from '../utils/errors';

export interface ProjectLookupResult {
  project: RawProjectRow;
  detail: ProjectDetail;
  relation: ProjectRelation;
  milestoneStats: MilestoneStats;
}

export class ProjectService {
  constructor(
    private pool: Pool,
    private projectRepo: ProjectRepository,
    private userRepo: UserRepository
  ) {}

  async getProjectForUser(
    clientOrPool: Pool | PoolClient,
    projectId: string,
    user: User,
    forUpdate = false
  ): Promise<ProjectLookupResult> {
    const raw = await this.projectRepo.findRawProjectById(
      clientOrPool,
      projectId,
      forUpdate
    );
    if (!raw) {
      throw notFound('Project not found');
    }

    const isMember = await this.projectRepo.isUserMember(
      clientOrPool,
      projectId,
      user.id
    );
    const isCreator = raw.created_by === user.id;
    const isGuide = raw.guide_id === user.id && user.role === 'FACULTY';

    // Students who are not members get 404 (never 403, to avoid leaking existence)
    if (user.role === 'STUDENT' && !isMember) {
      throw notFound('Project not found');
    }

    const relation: ProjectRelation = { isCreator, isMember, isGuide };
    const members = await this.projectRepo.getProjectMembers(clientOrPool, projectId);
    const milestoneStats = await this.projectRepo.getMilestoneStats(
      clientOrPool,
      projectId
    );

    const permissions = computePermissions(
      {
        status: raw.status,
        archivedAt: raw.archived_at ? raw.archived_at.toISOString() : null,
      },
      user,
      relation,
      milestoneStats
    );

    const progress =
      milestoneStats.total === 0
        ? 0
        : Math.round((100 * milestoneStats.completed) / milestoneStats.total);

    const detail: ProjectDetail = {
      id: raw.id,
      title: raw.title,
      description: raw.description,
      status: raw.status,
      guide: { id: raw.guide_id, fullName: raw.guide_name },
      createdBy: { id: raw.created_by, fullName: raw.creator_name },
      memberCount: members.length,
      milestoneTotal: milestoneStats.total,
      milestoneCompleted: milestoneStats.completed,
      progress,
      submissionDate: raw.submission_date
        ? raw.submission_date instanceof Date
          ? raw.submission_date.toISOString()
          : new Date(raw.submission_date).toISOString()
        : null,
      completedAt: raw.completed_at
        ? raw.completed_at instanceof Date
          ? raw.completed_at.toISOString()
          : new Date(raw.completed_at).toISOString()
        : null,
      archivedAt: raw.archived_at
        ? raw.archived_at instanceof Date
          ? raw.archived_at.toISOString()
          : new Date(raw.archived_at).toISOString()
        : null,
      createdAt:
        raw.created_at instanceof Date
          ? raw.created_at.toISOString()
          : new Date(raw.created_at).toISOString(),
      updatedAt:
        raw.updated_at instanceof Date
          ? raw.updated_at.toISOString()
          : new Date(raw.updated_at).toISOString(),
      members,
      permissions,
    };

    return {
      project: raw,
      detail,
      relation,
      milestoneStats,
    };
  }

  async createProject(
    user: User,
    data: { title: string; description: string; guideId: string }
  ): Promise<ProjectDetail> {
    if (user.role !== 'STUDENT') {
      throw forbidden('Only students can create projects');
    }

    const guideUser = await this.userRepo.findById(data.guideId);
    if (!guideUser || guideUser.role !== 'FACULTY') {
      throw validationError('guideId must reference an existing FACULTY user');
    }

    return withTransaction(this.pool, async (client) => {
      const raw = await this.projectRepo.insertProject(client, {
        title: data.title,
        description: data.description,
        guideId: data.guideId,
        createdBy: user.id,
      });

      await this.projectRepo.insertProjectMember(client, {
        projectId: raw.id,
        studentId: user.id,
        membershipRole: 'LEAD',
      });

      await this.projectRepo.insertStatusHistory(client, {
        projectId: raw.id,
        previousStatus: null,
        newStatus: 'DRAFT',
        changedBy: user.id,
        reason: null,
      });

      const res = await this.getProjectForUser(client, raw.id, user);
      return res.detail;
    });
  }

  async updateProject(
    user: User,
    projectId: string,
    data: { title?: string; description?: string; guideId?: string }
  ): Promise<ProjectDetail> {
    return withTransaction(this.pool, async (client) => {
      const { project, detail } = await this.getProjectForUser(
        client,
        projectId,
        user,
        true
      );

      if (project.archived_at) {
        throw projectArchived();
      }

      if (!detail.permissions.canEdit) {
        throw forbidden('Cannot edit project in its current state');
      }

      if (data.guideId !== undefined) {
        if (!detail.permissions.canChangeGuide) {
          throw forbidden('Cannot change guide in current state');
        }
        const guideUser = await this.userRepo.findById(data.guideId);
        if (!guideUser || guideUser.role !== 'FACULTY') {
          throw validationError('guideId must reference a FACULTY user');
        }
      }

      await this.projectRepo.updateProject(client, projectId, data);

      const updated = await this.getProjectForUser(client, projectId, user);
      return updated.detail;
    });
  }

  async deleteProject(user: User, projectId: string): Promise<void> {
    return withTransaction(this.pool, async (client) => {
      const { project, detail } = await this.getProjectForUser(
        client,
        projectId,
        user,
        true
      );

      if (!project.archived_at) {
        throw invalidState('A non-archived project cannot be soft-deleted');
      }

      if (!detail.permissions.canDelete) {
        throw forbidden('Only the assigned guide can delete an archived project');
      }

      await this.projectRepo.deleteProject(client, projectId, user.id);
    });
  }

  async submitProject(user: User, projectId: string): Promise<ProjectDetail> {
    return withTransaction(this.pool, async (client) => {
      const { project, detail, relation } = await this.getProjectForUser(
        client,
        projectId,
        user,
        true
      );

      if (project.archived_at) {
        throw projectArchived();
      }

      if (!relation.isCreator) {
        throw forbidden('Only the project creator can submit');
      }

      if (!['DRAFT', 'CHANGES_REQUESTED', 'REJECTED'].includes(project.status)) {
        throw invalidState(`Cannot submit project in status "${project.status}"`);
      }

      if (!project.title.trim() || !project.description.trim() || !project.guide_id) {
        throw validationError('Title, description and guide are required to submit');
      }

      await this.projectRepo.updateProject(client, projectId, {
        status: 'PENDING_REVIEW',
        submissionDate: new Date(),
      });

      await this.projectRepo.insertStatusHistory(client, {
        projectId,
        previousStatus: project.status,
        newStatus: 'PENDING_REVIEW',
        changedBy: user.id,
        reason: null,
      });

      const updated = await this.getProjectForUser(client, projectId, user);
      return updated.detail;
    });
  }

  async approveProject(
    user: User,
    projectId: string,
    message?: string
  ): Promise<ProjectDetail> {
    return withTransaction(this.pool, async (client) => {
      const { project, detail, relation } = await this.getProjectForUser(
        client,
        projectId,
        user,
        true
      );

      if (project.archived_at) {
        throw projectArchived();
      }

      if (user.role === 'STUDENT' || !relation.isGuide) {
        throw forbidden('Only the assigned faculty guide can approve');
      }

      if (project.status !== 'PENDING_REVIEW') {
        throw invalidState(`Cannot approve project in status "${project.status}"`);
      }

      await this.projectRepo.updateProject(client, projectId, {
        status: 'IN_PROGRESS',
      });

      await this.projectRepo.insertStatusHistory(client, {
        projectId,
        previousStatus: 'PENDING_REVIEW',
        newStatus: 'IN_PROGRESS',
        changedBy: user.id,
        reason: message || null,
      });

      await this.projectRepo.insertFeedback(client, {
        projectId,
        facultyId: user.id,
        message: message || 'Project approved.',
        feedbackType: 'APPROVAL',
      });

      const updated = await this.getProjectForUser(client, projectId, user);
      return updated.detail;
    });
  }

  async requestChangesProject(
    user: User,
    projectId: string,
    message: string
  ): Promise<ProjectDetail> {
    return withTransaction(this.pool, async (client) => {
      const { project, detail, relation } = await this.getProjectForUser(
        client,
        projectId,
        user,
        true
      );

      if (project.archived_at) {
        throw projectArchived();
      }

      if (user.role === 'STUDENT' || !relation.isGuide) {
        throw forbidden('Only the assigned faculty guide can request changes');
      }

      if (project.status !== 'PENDING_REVIEW') {
        throw invalidState(
          `Cannot request changes for project in status "${project.status}"`
        );
      }

      await this.projectRepo.updateProject(client, projectId, {
        status: 'CHANGES_REQUESTED',
      });

      await this.projectRepo.insertStatusHistory(client, {
        projectId,
        previousStatus: 'PENDING_REVIEW',
        newStatus: 'CHANGES_REQUESTED',
        changedBy: user.id,
        reason: message,
      });

      await this.projectRepo.insertFeedback(client, {
        projectId,
        facultyId: user.id,
        message,
        feedbackType: 'CHANGES_REQUESTED',
      });

      const updated = await this.getProjectForUser(client, projectId, user);
      return updated.detail;
    });
  }

  async rejectProject(
    user: User,
    projectId: string,
    message: string
  ): Promise<ProjectDetail> {
    return withTransaction(this.pool, async (client) => {
      const { project, detail, relation } = await this.getProjectForUser(
        client,
        projectId,
        user,
        true
      );

      if (project.archived_at) {
        throw projectArchived();
      }

      if (user.role === 'STUDENT' || !relation.isGuide) {
        throw forbidden('Only the assigned faculty guide can reject');
      }

      if (project.status !== 'PENDING_REVIEW') {
        throw invalidState(`Cannot reject project in status "${project.status}"`);
      }

      await this.projectRepo.updateProject(client, projectId, {
        status: 'REJECTED',
      });

      await this.projectRepo.insertStatusHistory(client, {
        projectId,
        previousStatus: 'PENDING_REVIEW',
        newStatus: 'REJECTED',
        changedBy: user.id,
        reason: message,
      });

      await this.projectRepo.insertFeedback(client, {
        projectId,
        facultyId: user.id,
        message,
        feedbackType: 'REJECTION',
      });

      const updated = await this.getProjectForUser(client, projectId, user);
      return updated.detail;
    });
  }

  async completeProject(
    user: User,
    projectId: string,
    message?: string
  ): Promise<ProjectDetail> {
    return withTransaction(this.pool, async (client) => {
      const { project, detail, relation } = await this.getProjectForUser(
        client,
        projectId,
        user,
        true
      );

      if (project.archived_at) {
        throw projectArchived();
      }

      if (user.role === 'STUDENT' || !relation.isGuide) {
        throw forbidden('Only the assigned faculty guide can complete project');
      }

      if (project.status !== 'IN_PROGRESS') {
        throw invalidState(`Cannot complete project in status "${project.status}"`);
      }

      const stats = await this.projectRepo.getMilestoneStats(client, projectId);
      if (stats.total === 0) {
        throw completionBlocked('NO_MILESTONES', 'Project has no milestones');
      }
      if (stats.completed < stats.total) {
        throw completionBlocked(
          'INCOMPLETE_MILESTONES',
          'Not all milestones are completed'
        );
      }

      await this.projectRepo.updateProject(client, projectId, {
        status: 'COMPLETED',
        completedAt: new Date(),
      });

      await this.projectRepo.insertStatusHistory(client, {
        projectId,
        previousStatus: 'IN_PROGRESS',
        newStatus: 'COMPLETED',
        changedBy: user.id,
        reason: message || null,
      });

      const updated = await this.getProjectForUser(client, projectId, user);
      return updated.detail;
    });
  }

  async archiveProject(user: User, projectId: string): Promise<ProjectDetail> {
    return withTransaction(this.pool, async (client) => {
      const { project, detail } = await this.getProjectForUser(
        client,
        projectId,
        user,
        true
      );

      if (project.archived_at) {
        throw projectArchived();
      }

      if (!detail.permissions.canArchive) {
        throw forbidden('Cannot archive project in current status or role');
      }

      await this.projectRepo.archiveProject(client, projectId, user.id);

      const updated = await this.getProjectForUser(client, projectId, user);
      return updated.detail;
    });
  }

  async restoreProject(user: User, projectId: string): Promise<ProjectDetail> {
    return withTransaction(this.pool, async (client) => {
      const { project, detail } = await this.getProjectForUser(
        client,
        projectId,
        user,
        true
      );

      if (!project.archived_at) {
        throw invalidState('Project is not archived');
      }

      if (!detail.permissions.canRestore) {
        throw forbidden('Cannot restore project in current status or role');
      }

      await this.projectRepo.restoreProject(client, projectId);

      const updated = await this.getProjectForUser(client, projectId, user);
      return updated.detail;
    });
  }

  async getHistory(user: User, projectId: string): Promise<HistoryEntry[]> {
    // Check permission to view project
    await this.getProjectForUser(this.pool, projectId, user);
    return this.projectRepo.getStatusHistory(this.pool, projectId);
  }

  async listProjects(
    user: User,
    query: {
      status?: ProjectStatus;
      guide?: string;
      search?: string;
      archived?: boolean;
      assignedMe?: boolean;
      page: number;
      pageSize: number;
      sort: 'updatedAt' | 'createdAt' | 'title' | 'status';
      order: 'asc' | 'desc';
    }
  ): Promise<{ items: ProjectSummary[]; page: number; pageSize: number; total: number }> {
    const res = await this.projectRepo.listProjects(this.pool, {
      ...query,
      userId: user.id,
      userRole: user.role,
    });
    return {
      items: res.items,
      page: query.page,
      pageSize: query.pageSize,
      total: res.total,
    };
  }
}
