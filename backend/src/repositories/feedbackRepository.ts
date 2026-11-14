import { Pool, PoolClient } from 'pg';
import { Feedback, FeedbackType } from '../types';

type Queryable = Pool | PoolClient;

export interface RawFeedbackRow {
  id: string;
  project_id: string;
  faculty_id: string;
  author_name: string;
  message: string;
  feedback_type: FeedbackType;
  created_at: Date;
}

export class FeedbackRepository {
  async findByProjectId(
    clientOrPool: Queryable,
    projectId: string
  ): Promise<Feedback[]> {
    const res = await clientOrPool.query<RawFeedbackRow>(
      `SELECT f.id, f.project_id, f.faculty_id, u.full_name as author_name,
              f.message, f.feedback_type, f.created_at
       FROM project_feedback f
       JOIN users u ON f.faculty_id = u.id
       WHERE f.project_id = $1
       ORDER BY f.created_at DESC`,
      [projectId]
    );

    return res.rows.map((r) => ({
      id: r.id,
      projectId: r.project_id,
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
  }

  async insert(
    client: PoolClient,
    params: {
      projectId: string;
      facultyId: string;
      message: string;
      feedbackType: FeedbackType;
    }
  ): Promise<Feedback> {
    const res = await client.query<{ id: string; created_at: Date }>(
      `INSERT INTO project_feedback (project_id, faculty_id, message, feedback_type)
       VALUES ($1, $2, $3, $4)
       RETURNING id, created_at`,
      [
        params.projectId,
        params.facultyId,
        params.message.trim(),
        params.feedbackType,
      ]
    );

    const authorRes = await client.query<{ full_name: string }>(
      'SELECT full_name FROM users WHERE id = $1',
      [params.facultyId]
    );

    return {
      id: res.rows[0].id,
      projectId: params.projectId,
      author: {
        id: params.facultyId,
        fullName: authorRes.rows[0]?.full_name || '',
      },
      message: params.message.trim(),
      feedbackType: params.feedbackType,
      createdAt: res.rows[0].created_at.toISOString(),
    };
  }
}
