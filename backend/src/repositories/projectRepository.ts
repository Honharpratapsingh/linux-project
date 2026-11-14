import { Pool, PoolClient } from 'pg';
import {
  ProjectSummary,
  ProjectDetail,
  ProjectStatus,
  Member,
  HistoryEntry,
  UserRef,
  FeedbackType,
} from '../types';
import { MilestoneStats } from '../services/workflow';

type Queryable = Pool | PoolClient;

export interface RawProjectRow {
  id: string;
  title: string;
  description: string;
  status: ProjectStatus;
  created_by: string;
  guide_id: string;
  submission_date: Date | null;
  completed_at: Date | null;
  archived_at: Date | null;
  archived_by: string | null;
  deleted_at: Date | null;
  deleted_by: string | null;
  created_at: Date;
  updated_at: Date;
  guide_name: string;
  creator_name: string;
}

export function escapeLike(str: string): string {
  return str.replace(/([%_\\])/g, '\\$1');
}

export class ProjectRepository {
  async findRawProjectById(
    clientOrPool: Queryable,
    id: string,
    forUpdate = false
  ): Promise<RawProjectRow | null> {
    const lockClause = forUpdate ? 'FOR UPDATE OF p' : '';
    const res = await clientOrPool.query<RawProjectRow>(
      `SELECT p.*, g.full_name as guide_name, c.full_name as creator_name
       FROM projects p
       JOIN users g ON p.guide_id = g.id
       JOIN users c ON p.created_by = c.id
       WHERE p.id = $1 AND p.deleted_at IS NULL
       ${lockClause}`,
      [id]
    );
    return res.rows[0] || null;
  }

  async getProjectMembers(
    clientOrPool: Queryable,
    projectId: string
  ): Promise<Member[]> {
    const res = await clientOrPool.query<{
      student_id: string;
      full_name: string;
      email: string;
      registration_number: string | null;
      membership_role: 'LEAD' | 'MEMBER';
      joined_at: Date;
    }>(
      `SELECT pm.student_id, u.full_name, u.email, u.registration_number, pm.membership_role, pm.joined_at
       FROM project_members pm
       JOIN users u ON pm.student_id = u.id
       WHERE pm.project_id = $1
       ORDER BY pm.joined_at ASC`,
      [projectId]
    );

    return res.rows.map((r) => ({
      studentId: r.student_id,
      fullName: r.full_name,
      email: r.email,
      registrationNumber: r.registration_number,
      membershipRole: r.membership_role,
      joinedAt:
        r.joined_at instanceof Date
          ? r.joined_at.toISOString()
          : new Date(r.joined_at).toISOString(),
    }));
  }

  async getMilestoneStats(
    clientOrPool: Queryable,
    projectId: string
  ): Promise<MilestoneStats> {
    const res = await clientOrPool.query<{
      total: string;
      completed: string;
    }>(
      `SELECT
         count(*)::text as total,
         count(*) FILTER (WHERE is_completed = true)::text as completed
       FROM milestones
       WHERE project_id = $1`,
      [projectId]
    );
    const total = parseInt(res.rows[0]?.total || '0', 10);
    const completed = parseInt(res.rows[0]?.completed || '0', 10);
    return { total, completed };
  }

  async isUserMember(
    clientOrPool: Queryable,
    projectId: string,
    userId: string
  ): Promise<boolean> {
    const res = await clientOrPool.query(
      'SELECT 1 FROM project_members WHERE project_id = $1 AND student_id = $2',
      [projectId, userId]
    );
    return res.rows.length > 0;
  }

  async insertProject(
    client: PoolClient,
    params: {
      title: string;
      description: string;
      guideId: string;
      createdBy: string;
    }
  ): Promise<RawProjectRow> {
    const res = await client.query<RawProjectRow>(
      `INSERT INTO projects (title, description, created_by, guide_id, status)
       VALUES ($1, $2, $3, $4, 'DRAFT')
       RETURNING *`,
      [params.title.trim(), params.description.trim(), params.createdBy, params.guideId]
    );
    const raw = res.rows[0];

    // Fetch names
    const names = await client.query<{ guide_name: string; creator_name: string }>(
      `SELECT g.full_name as guide_name, c.full_name as creator_name
       FROM users g, users c
       WHERE g.id = $1 AND c.id = $2`,
      [raw.guide_id, raw.created_by]
    );
    raw.guide_name = names.rows[0]?.guide_name || '';
    raw.creator_name = names.rows[0]?.creator_name || '';
    return raw;
  }

  async insertProjectMember(
    client: PoolClient,
    params: {
      projectId: string;
      studentId: string;
      membershipRole: 'LEAD' | 'MEMBER';
    }
  ): Promise<void> {
    await client.query(
      `INSERT INTO project_members (project_id, student_id, membership_role)
       VALUES ($1, $2, $3)`,
      [params.projectId, params.studentId, params.membershipRole]
    );
  }

  async insertStatusHistory(
    client: PoolClient,
    params: {
      projectId: string;
      previousStatus: ProjectStatus | null;
      newStatus: ProjectStatus;
      changedBy: string;
      reason: string | null;
    }
  ): Promise<void> {
    await client.query(
      `INSERT INTO project_status_history (project_id, previous_status, new_status, changed_by, reason)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        params.projectId,
        params.previousStatus,
        params.newStatus,
        params.changedBy,
        params.reason,
      ]
    );
  }

  async insertFeedback(
    client: PoolClient,
    params: {
      projectId: string;
      facultyId: string;
      message: string;
      feedbackType: FeedbackType;
    }
  ): Promise<void> {
    await client.query(
      `INSERT INTO project_feedback (project_id, faculty_id, message, feedback_type)
       VALUES ($1, $2, $3, $4)`,
      [params.projectId, params.facultyId, params.message.trim(), params.feedbackType]
    );
  }

  async updateProject(
    client: PoolClient,
    id: string,
    fields: {
      title?: string;
      description?: string;
      guideId?: string;
      status?: ProjectStatus;
      submissionDate?: Date | null;
      completedAt?: Date | null;
    }
  ): Promise<void> {
    const setClauses: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (fields.title !== undefined) {
      setClauses.push(`title = $${idx++}`);
      values.push(fields.title.trim());
    }
    if (fields.description !== undefined) {
      setClauses.push(`description = $${idx++}`);
      values.push(fields.description.trim());
    }
    if (fields.guideId !== undefined) {
      setClauses.push(`guide_id = $${idx++}`);
      values.push(fields.guideId);
    }
    if (fields.status !== undefined) {
      setClauses.push(`status = $${idx++}`);
      values.push(fields.status);
    }
    if (fields.submissionDate !== undefined) {
      setClauses.push(`submission_date = $${idx++}`);
      values.push(fields.submissionDate);
    }
    if (fields.completedAt !== undefined) {
      setClauses.push(`completed_at = $${idx++}`);
      values.push(fields.completedAt);
    }

    if (setClauses.length === 0) return;

    values.push(id);
    await client.query(
      `UPDATE projects SET ${setClauses.join(', ')} WHERE id = $${idx}`,
      values
    );
  }

  async archiveProject(client: PoolClient, id: string, userId: string): Promise<void> {
    await client.query(
      `UPDATE projects
       SET archived_at = now(), archived_by = $1
       WHERE id = $2`,
      [userId, id]
    );
  }

  async restoreProject(client: PoolClient, id: string): Promise<void> {
    await client.query(
      `UPDATE projects
       SET archived_at = null, archived_by = null
       WHERE id = $1`,
      [id]
    );
  }

  async deleteProject(client: PoolClient, id: string, userId: string): Promise<void> {
    await client.query(
      `UPDATE projects
       SET deleted_at = now(), deleted_by = $1
       WHERE id = $2`,
      [userId, id]
    );
  }

  async getStatusHistory(pool: Pool, projectId: string): Promise<HistoryEntry[]> {
    const res = await pool.query<{
      id: string;
      previous_status: ProjectStatus | null;
      new_status: ProjectStatus;
      reason: string | null;
      created_at: Date;
      user_id: string;
      user_name: string;
    }>(
      `SELECT h.id, h.previous_status, h.new_status, h.reason, h.created_at,
              u.id as user_id, u.full_name as user_name
       FROM project_status_history h
       JOIN users u ON h.changed_by = u.id
       WHERE h.project_id = $1
       ORDER BY h.created_at ASC`,
      [projectId]
    );

    return res.rows.map((r) => ({
      id: r.id,
      previousStatus: r.previous_status,
      newStatus: r.new_status,
      changedBy: {
        id: r.user_id,
        fullName: r.user_name,
      },
      reason: r.reason,
      createdAt:
        r.created_at instanceof Date
          ? r.created_at.toISOString()
          : new Date(r.created_at).toISOString(),
    }));
  }

  async listProjects(
    pool: Pool,
    options: {
      userId: string;
      userRole: 'STUDENT' | 'FACULTY';
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
  ): Promise<{ items: ProjectSummary[]; total: number }> {
    const conditions: string[] = ['p.deleted_at IS NULL'];
    const values: any[] = [];
    let idx = 1;

    // Visibility:
    if (options.userRole === 'STUDENT') {
      conditions.push(
        `p.id IN (SELECT project_id FROM project_members WHERE student_id = $${idx++})`
      );
      values.push(options.userId);
    }

    // Archived filter
    if (options.archived === true) {
      conditions.push('p.archived_at IS NOT NULL');
    } else {
      conditions.push('p.archived_at IS NULL');
    }

    // Status filter
    if (options.status) {
      conditions.push(`p.status = $${idx++}`);
      values.push(options.status);
    }

    // Assigned=me (faculty only)
    if (options.assignedMe && options.userRole === 'FACULTY') {
      conditions.push(`p.guide_id = $${idx++}`);
      values.push(options.userId);
    }

    // Guide search
    if (options.guide) {
      conditions.push(`g.full_name ILIKE '%' || $${idx++} || '%' ESCAPE '\\'`);
      values.push(escapeLike(options.guide));
    }

    // Title search
    if (options.search) {
      conditions.push(`p.title ILIKE '%' || $${idx++} || '%' ESCAPE '\\'`);
      values.push(escapeLike(options.search));
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Total count query
    const countSql = `
      SELECT count(*)::text as total
      FROM projects p
      JOIN users g ON p.guide_id = g.id
      ${whereClause}
    `;
    const countRes = await pool.query<{ total: string }>(countSql, values);
    const total = parseInt(countRes.rows[0]?.total || '0', 10);

    // Sorting
    const sortColumnMap: Record<string, string> = {
      updatedAt: 'p.updated_at',
      createdAt: 'p.created_at',
      title: 'p.title',
      status: 'p.status',
    };
    const sortCol = sortColumnMap[options.sort] || 'p.updated_at';
    const sortDir = options.order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const offset = (options.page - 1) * options.pageSize;
    const limit = options.pageSize;

    const dataValues = [...values, limit, offset];
    const dataSql = `
      SELECT p.*, g.full_name as guide_name, c.full_name as creator_name,
             (SELECT count(*)::int FROM project_members WHERE project_id = p.id) as member_count,
             (SELECT count(*)::int FROM milestones WHERE project_id = p.id) as milestone_total,
             (SELECT count(*)::int FROM milestones WHERE project_id = p.id AND is_completed = true) as milestone_completed
      FROM projects p
      JOIN users g ON p.guide_id = g.id
      JOIN users c ON p.created_by = c.id
      ${whereClause}
      ORDER BY ${sortCol} ${sortDir}, p.id ASC
      LIMIT $${idx++} OFFSET $${idx++}
    `;

    const dataRes = await pool.query<
      RawProjectRow & {
        member_count: number;
        milestone_total: number;
        milestone_completed: number;
      }
    >(dataSql, dataValues);

    const items: ProjectSummary[] = dataRes.rows.map((r) => {
      const mTotal = Number(r.milestone_total) || 0;
      const mCompleted = Number(r.milestone_completed) || 0;
      const progress = mTotal === 0 ? 0 : Math.round((100 * mCompleted) / mTotal);

      return {
        id: r.id,
        title: r.title,
        description: r.description,
        status: r.status,
        guide: { id: r.guide_id, fullName: r.guide_name },
        createdBy: { id: r.created_by, fullName: r.creator_name },
        memberCount: Number(r.member_count) || 0,
        milestoneTotal: mTotal,
        milestoneCompleted: mCompleted,
        progress,
        submissionDate: r.submission_date
          ? r.submission_date instanceof Date
            ? r.submission_date.toISOString()
            : new Date(r.submission_date).toISOString()
          : null,
        completedAt: r.completed_at
          ? r.completed_at instanceof Date
            ? r.completed_at.toISOString()
            : new Date(r.completed_at).toISOString()
          : null,
        archivedAt: r.archived_at
          ? r.archived_at instanceof Date
            ? r.archived_at.toISOString()
            : new Date(r.archived_at).toISOString()
          : null,
        createdAt:
          r.created_at instanceof Date
            ? r.created_at.toISOString()
            : new Date(r.created_at).toISOString(),
        updatedAt:
          r.updated_at instanceof Date
            ? r.updated_at.toISOString()
            : new Date(r.updated_at).toISOString(),
      };
    });

    return { items, total };
  }
}
