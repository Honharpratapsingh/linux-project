import { Pool } from 'pg';
import { ProjectSummary, ProjectStatus, UserRef, FeedbackType } from '../types';
import { ProjectRepository } from './projectRepository';
import { formatDueDate } from './milestoneRepository';

export interface UpcomingMilestoneItem {
  id: string;
  projectId: string;
  projectTitle: string;
  title: string;
  dueDate: string;
}

export interface RecentFeedbackItem {
  projectId: string;
  projectTitle: string;
  author: UserRef;
  message: string;
  feedbackType: FeedbackType;
  createdAt: string;
}

export interface StudentDashboardSummary {
  role: 'STUDENT';
  countsByStatus: Record<ProjectStatus, number>;
  activeProject: ProjectSummary | null;
  upcomingMilestones: UpcomingMilestoneItem[];
  recentFeedback: RecentFeedbackItem[];
}

export interface FacultyDashboardSummary {
  role: 'FACULTY';
  countsByStatus: Record<ProjectStatus, number>;
  pendingReviewsForMe: number;
  pendingReviewItems: ProjectSummary[];
  readyToComplete: ProjectSummary[];
}

export class DashboardRepository {
  constructor(
    private pool: Pool,
    private projectRepo: ProjectRepository
  ) {}

  private emptyCounts(): Record<ProjectStatus, number> {
    return {
      DRAFT: 0,
      PENDING_REVIEW: 0,
      CHANGES_REQUESTED: 0,
      REJECTED: 0,
      IN_PROGRESS: 0,
      COMPLETED: 0,
    };
  }

  async getStudentSummary(studentId: string): Promise<StudentDashboardSummary> {
    // 1. countsByStatus
    const countsRes = await this.pool.query<{ status: ProjectStatus; count: number }>(
      `SELECT p.status, count(*)::int as count
       FROM projects p
       JOIN project_members pm ON p.id = pm.project_id
       WHERE pm.student_id = $1
         AND p.archived_at IS NULL
         AND p.deleted_at IS NULL
       GROUP BY p.status`,
      [studentId]
    );

    const counts = this.emptyCounts();
    for (const r of countsRes.rows) {
      if (counts[r.status] !== undefined) {
        counts[r.status] = Number(r.count);
      }
    }

    // 2. activeProject: most recently updated IN_PROGRESS, else most recently updated non-archived
    const activeRes = await this.pool.query<{ id: string }>(
      `SELECT p.id
       FROM projects p
       JOIN project_members pm ON p.id = pm.project_id
       WHERE pm.student_id = $1
         AND p.status = 'IN_PROGRESS'
         AND p.archived_at IS NULL
         AND p.deleted_at IS NULL
       ORDER BY p.updated_at DESC
       LIMIT 1`,
      [studentId]
    );

    let activeProjectId = activeRes.rows[0]?.id;
    if (!activeProjectId) {
      const fallbackRes = await this.pool.query<{ id: string }>(
        `SELECT p.id
         FROM projects p
         JOIN project_members pm ON p.id = pm.project_id
         WHERE pm.student_id = $1
           AND p.archived_at IS NULL
           AND p.deleted_at IS NULL
         ORDER BY p.updated_at DESC
         LIMIT 1`,
        [studentId]
      );
      activeProjectId = fallbackRes.rows[0]?.id;
    }

    let activeProject: ProjectSummary | null = null;
    if (activeProjectId) {
      const list = await this.projectRepo.listProjects(this.pool, {
        userId: studentId,
        userRole: 'STUDENT',
        page: 1,
        pageSize: 1,
        sort: 'updatedAt',
        order: 'desc',
      });
      // Find the specific active project
      const raw = await this.projectRepo.findRawProjectById(
        this.pool,
        activeProjectId
      );
      if (raw) {
        const stats = await this.projectRepo.getMilestoneStats(
          this.pool,
          activeProjectId
        );
        const mems = await this.projectRepo.getProjectMembers(
          this.pool,
          activeProjectId
        );
        const progress =
          stats.total === 0 ? 0 : Math.round((100 * stats.completed) / stats.total);

        activeProject = {
          id: raw.id,
          title: raw.title,
          description: raw.description,
          status: raw.status,
          guide: { id: raw.guide_id, fullName: raw.guide_name },
          createdBy: { id: raw.created_by, fullName: raw.creator_name },
          memberCount: mems.length,
          milestoneTotal: stats.total,
          milestoneCompleted: stats.completed,
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
        };
      }
    }

    // 3. upcomingMilestones: next 5 incomplete milestones with a due date across projects where milestones are manageable
    const milesRes = await this.pool.query<{
      id: string;
      project_id: string;
      project_title: string;
      title: string;
      due_date: Date | string;
    }>(
      `SELECT m.id, m.project_id, p.title as project_title, m.title, m.due_date
       FROM milestones m
       JOIN projects p ON m.project_id = p.id
       JOIN project_members pm ON p.id = pm.project_id
       WHERE pm.student_id = $1
         AND m.is_completed = false
         AND m.due_date IS NOT NULL
         AND p.status IN ('DRAFT', 'CHANGES_REQUESTED', 'REJECTED', 'IN_PROGRESS')
         AND p.archived_at IS NULL
         AND p.deleted_at IS NULL
       ORDER BY m.due_date ASC, m.created_at ASC
       LIMIT 5`,
      [studentId]
    );

    const upcomingMilestones: UpcomingMilestoneItem[] = milesRes.rows.map((r) => ({
      id: r.id,
      projectId: r.project_id,
      projectTitle: r.project_title,
      title: r.title,
      dueDate: formatDueDate(r.due_date) || '',
    }));

    // 4. recentFeedback: latest 5 across their projects
    const fbRes = await this.pool.query<{
      project_id: string;
      project_title: string;
      faculty_id: string;
      author_name: string;
      message: string;
      feedback_type: FeedbackType;
      created_at: Date;
    }>(
      `SELECT f.project_id, p.title as project_title, f.faculty_id,
              u.full_name as author_name, f.message, f.feedback_type, f.created_at
       FROM project_feedback f
       JOIN projects p ON f.project_id = p.id
       JOIN project_members pm ON p.id = pm.project_id
       JOIN users u ON f.faculty_id = u.id
       WHERE pm.student_id = $1 AND p.deleted_at IS NULL
       ORDER BY f.created_at DESC
       LIMIT 5`,
      [studentId]
    );

    const recentFeedback: RecentFeedbackItem[] = fbRes.rows.map((r) => ({
      projectId: r.project_id,
      projectTitle: r.project_title,
      author: {
        id: r.faculty_id,
        fullName: r.author_name,
      },
      message: r.message,
      feedbackType: r.feedback_type,
      createdAt:
        r.created_at instanceof Date
          ? r.created_at.toISOString()
          : new Date(r.created_at).toISOString(),
    }));

    return {
      role: 'STUDENT',
      countsByStatus: counts,
      activeProject,
      upcomingMilestones,
      recentFeedback,
    };
  }

  async getFacultySummary(facultyId: string): Promise<FacultyDashboardSummary> {
    // 1. countsByStatus across all non-archived, non-deleted projects
    const countsRes = await this.pool.query<{ status: ProjectStatus; count: number }>(
      `SELECT p.status, count(*)::int as count
       FROM projects p
       WHERE p.archived_at IS NULL AND p.deleted_at IS NULL
       GROUP BY p.status`
    );

    const counts = this.emptyCounts();
    for (const r of countsRes.rows) {
      if (counts[r.status] !== undefined) {
        counts[r.status] = Number(r.count);
      }
    }

    // 2. pendingReviewsForMe
    const pendingCountRes = await this.pool.query<{ count: number }>(
      `SELECT count(*)::int as count
       FROM projects p
       WHERE p.guide_id = $1
         AND p.status = 'PENDING_REVIEW'
         AND p.archived_at IS NULL
         AND p.deleted_at IS NULL`,
      [facultyId]
    );
    const pendingReviewsForMe = Number(pendingCountRes.rows[0]?.count || 0);

    // Helper to get ProjectSummary list from project IDs
    const fetchSummaries = async (ids: string[]): Promise<ProjectSummary[]> => {
      if (ids.length === 0) return [];
      const summaries: ProjectSummary[] = [];
      for (const id of ids) {
        const raw = await this.projectRepo.findRawProjectById(this.pool, id);
        if (!raw) continue;
        const stats = await this.projectRepo.getMilestoneStats(this.pool, id);
        const mems = await this.projectRepo.getProjectMembers(this.pool, id);
        const progress =
          stats.total === 0 ? 0 : Math.round((100 * stats.completed) / stats.total);

        summaries.push({
          id: raw.id,
          title: raw.title,
          description: raw.description,
          status: raw.status,
          guide: { id: raw.guide_id, fullName: raw.guide_name },
          createdBy: { id: raw.created_by, fullName: raw.creator_name },
          memberCount: mems.length,
          milestoneTotal: stats.total,
          milestoneCompleted: stats.completed,
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
        });
      }
      return summaries;
    };

    // 3. pendingReviewItems: up to 5, assigned to me, oldest submission first
    const pendingItemsRes = await this.pool.query<{ id: string }>(
      `SELECT p.id
       FROM projects p
       WHERE p.guide_id = $1
         AND p.status = 'PENDING_REVIEW'
         AND p.archived_at IS NULL
         AND p.deleted_at IS NULL
       ORDER BY p.submission_date ASC NULLS LAST, p.id ASC
       LIMIT 5`,
      [facultyId]
    );
    const pendingReviewItems = await fetchSummaries(
      pendingItemsRes.rows.map((r) => r.id)
    );

    // 4. readyToComplete: up to 5 IN_PROGRESS projects assigned to me with >= 1 milestone and all completed
    const readyRes = await this.pool.query<{ id: string }>(
      `SELECT p.id
       FROM projects p
       WHERE p.guide_id = $1
         AND p.status = 'IN_PROGRESS'
         AND p.archived_at IS NULL
         AND p.deleted_at IS NULL
         AND (SELECT count(*) FROM milestones WHERE project_id = p.id) > 0
         AND (SELECT count(*) FROM milestones WHERE project_id = p.id AND is_completed = false) = 0
       ORDER BY p.updated_at DESC, p.id ASC
       LIMIT 5`,
      [facultyId]
    );
    const readyToComplete = await fetchSummaries(readyRes.rows.map((r) => r.id));

    return {
      role: 'FACULTY',
      countsByStatus: counts,
      pendingReviewsForMe,
      pendingReviewItems,
      readyToComplete,
    };
  }
}
