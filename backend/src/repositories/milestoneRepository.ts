import { Pool, PoolClient } from 'pg';
import { Milestone } from '../types';

type Queryable = Pool | PoolClient;

export interface RawMilestoneRow {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  due_date: Date | string | null;
  is_completed: boolean;
  completed_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export function formatDueDate(d: Date | string | null): string | null {
  if (!d) return null;
  if (typeof d === 'string') return d.slice(0, 10);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function mapMilestoneRow(r: RawMilestoneRow): Milestone {
  return {
    id: r.id,
    projectId: r.project_id,
    title: r.title,
    description: r.description,
    dueDate: formatDueDate(r.due_date),
    isCompleted: r.is_completed,
    completedAt: r.completed_at
      ? r.completed_at instanceof Date
        ? r.completed_at.toISOString()
        : new Date(r.completed_at).toISOString()
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
}

export class MilestoneRepository {
  async findByProjectId(
    clientOrPool: Queryable,
    projectId: string
  ): Promise<Milestone[]> {
    const res = await clientOrPool.query<RawMilestoneRow>(
      `SELECT * FROM milestones
       WHERE project_id = $1
       ORDER BY due_date ASC NULLS LAST, created_at ASC`,
      [projectId]
    );
    return res.rows.map(mapMilestoneRow);
  }

  async findById(
    clientOrPool: Queryable,
    id: string
  ): Promise<RawMilestoneRow | null> {
    const res = await clientOrPool.query<RawMilestoneRow>(
      'SELECT * FROM milestones WHERE id = $1',
      [id]
    );
    return res.rows[0] || null;
  }

  async insert(
    client: PoolClient,
    params: {
      projectId: string;
      title: string;
      description?: string | null;
      dueDate?: string | null;
    }
  ): Promise<Milestone> {
    const res = await client.query<RawMilestoneRow>(
      `INSERT INTO milestones (project_id, title, description, due_date)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [
        params.projectId,
        params.title.trim(),
        params.description?.trim() || null,
        params.dueDate || null,
      ]
    );
    return mapMilestoneRow(res.rows[0]);
  }

  async update(
    client: PoolClient,
    id: string,
    params: {
      title?: string;
      description?: string | null;
      dueDate?: string | null;
      isCompleted?: boolean;
    }
  ): Promise<Milestone | null> {
    const setClauses: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (params.title !== undefined) {
      setClauses.push(`title = $${idx++}`);
      values.push(params.title.trim());
    }
    if (params.description !== undefined) {
      setClauses.push(`description = $${idx++}`);
      values.push(params.description ? params.description.trim() : null);
    }
    if (params.dueDate !== undefined) {
      setClauses.push(`due_date = $${idx++}`);
      values.push(params.dueDate || null);
    }
    if (params.isCompleted !== undefined) {
      setClauses.push(`is_completed = $${idx++}`);
      values.push(params.isCompleted);
      if (params.isCompleted) {
        setClauses.push(`completed_at = now()`);
      } else {
        setClauses.push(`completed_at = null`);
      }
    }

    if (setClauses.length === 0) {
      const existing = await this.findById(client, id);
      return existing ? mapMilestoneRow(existing) : null;
    }

    values.push(id);
    const res = await client.query<RawMilestoneRow>(
      `UPDATE milestones SET ${setClauses.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );

    return res.rows[0] ? mapMilestoneRow(res.rows[0]) : null;
  }

  async delete(client: PoolClient, id: string): Promise<void> {
    await client.query('DELETE FROM milestones WHERE id = $1', [id]);
  }
}
