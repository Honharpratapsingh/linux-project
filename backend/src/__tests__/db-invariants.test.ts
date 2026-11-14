import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Pool, PoolClient } from 'pg';

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;

if (!TEST_DATABASE_URL) {
  throw new Error('TEST_DATABASE_URL must be set in environment');
}

const parsedDbUrl = new URL(TEST_DATABASE_URL);
const dbName = parsedDbUrl.pathname.replace(/^\//, '');
if (!dbName.endsWith('_test')) {
  throw new Error(`TEST_DATABASE_URL database name "${dbName}" must end in "_test"`);
}

describe('Database Invariant Tests', () => {
  let pool: Pool;
  let client: PoolClient;
  let studentId: string;
  let facultyId: string;
  let guideId: string;
  let projectId: string;

  beforeAll(async () => {
    pool = new Pool({ connectionString: TEST_DATABASE_URL });
    client = await pool.connect();

    // Clean test DB
    await client.query('TRUNCATE users CASCADE');
    await client.query('TRUNCATE session CASCADE');

    const u1 = await client.query(
      "INSERT INTO users (full_name, email, password_hash, role, registration_number) VALUES ('Student One', 's1@example.com', 'hash', 'STUDENT', 'RA123') RETURNING id"
    );
    studentId = u1.rows[0].id;

    const u2 = await client.query(
      "INSERT INTO users (full_name, email, password_hash, role) VALUES ('Faculty One', 'f1@example.com', 'hash', 'FACULTY') RETURNING id"
    );
    facultyId = u2.rows[0].id;

    const u3 = await client.query(
      "INSERT INTO users (full_name, email, password_hash, role) VALUES ('Guide Faculty', 'guide@example.com', 'hash', 'FACULTY') RETURNING id"
    );
    guideId = u3.rows[0].id;

    const p1 = await client.query(
      'INSERT INTO projects (title, description, created_by, guide_id, status) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      ['Base Project', 'Base Description', studentId, guideId, 'DRAFT']
    );
    projectId = p1.rows[0].id;
  });

  afterAll(async () => {
    if (client) client.release();
    if (pool) await pool.end();
  });

  // Negative constraint tests
  it('rejects deleted_at without archived_at', async () => {
    await expect(
      pool.query(
        `INSERT INTO projects (title, description, created_by, guide_id, status, deleted_at, deleted_by, archived_at, archived_by)
         VALUES ('P_del_no_arch', 'Desc', $1, $2, 'DRAFT', now(), $1, NULL, NULL)`,
        [studentId, guideId]
      )
    ).rejects.toThrow();
  });

  it('rejects archived_at without archived_by', async () => {
    await expect(
      pool.query(
        `INSERT INTO projects (title, description, created_by, guide_id, status, archived_at, archived_by)
         VALUES ('P_arch_no_by', 'Desc', $1, $2, 'DRAFT', now(), NULL)`,
        [studentId, guideId]
      )
    ).rejects.toThrow();
  });

  it('rejects deleted_at without deleted_by', async () => {
    await expect(
      pool.query(
        `INSERT INTO projects (title, description, created_by, guide_id, status, archived_at, archived_by, deleted_at, deleted_by)
         VALUES ('P_del_no_by', 'Desc', $1, $2, 'DRAFT', now(), $1, now(), NULL)`,
        [studentId, guideId]
      )
    ).rejects.toThrow();
  });

  it('rejects invalid status', async () => {
    await expect(
      pool.query(
        `INSERT INTO projects (title, description, created_by, guide_id, status)
         VALUES ('P_bad_status', 'Desc', $1, $2, 'INVALID_STATUS')`,
        [studentId, guideId]
      )
    ).rejects.toThrow();
  });

  it('rejects COMPLETED without completed_at', async () => {
    await expect(
      pool.query(
        `INSERT INTO projects (title, description, created_by, guide_id, status, completed_at)
         VALUES ('P_comp_no_at', 'Desc', $1, $2, 'COMPLETED', NULL)`,
        [studentId, guideId]
      )
    ).rejects.toThrow();
  });

  it('rejects two LEADs in one project', async () => {
    const s2 = await pool.query(
      "INSERT INTO users (full_name, email, password_hash, role) VALUES ('Student Two', 's2@example.com', 'hash', 'STUDENT') RETURNING id"
    );
    const s3 = await pool.query(
      "INSERT INTO users (full_name, email, password_hash, role) VALUES ('Student Three', 's3@example.com', 'hash', 'STUDENT') RETURNING id"
    );

    const pLead = await pool.query(
      'INSERT INTO projects (title, description, created_by, guide_id, status) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      ['P_Lead_Test', 'Desc', studentId, guideId, 'DRAFT']
    );

    await pool.query(
      'INSERT INTO project_members (project_id, student_id, membership_role) VALUES ($1, $2, $3)',
      [pLead.rows[0].id, s2.rows[0].id, 'LEAD']
    );

    await expect(
      pool.query(
        'INSERT INTO project_members (project_id, student_id, membership_role) VALUES ($1, $2, $3)',
        [pLead.rows[0].id, s3.rows[0].id, 'LEAD']
      )
    ).rejects.toThrow();
  });

  it('rejects duplicate (project_id, student_id)', async () => {
    const s4 = await pool.query(
      "INSERT INTO users (full_name, email, password_hash, role) VALUES ('Student Four', 's4@example.com', 'hash', 'STUDENT') RETURNING id"
    );

    await pool.query(
      'INSERT INTO project_members (project_id, student_id, membership_role) VALUES ($1, $2, $3)',
      [projectId, s4.rows[0].id, 'MEMBER']
    );

    await expect(
      pool.query(
        'INSERT INTO project_members (project_id, student_id, membership_role) VALUES ($1, $2, $3)',
        [projectId, s4.rows[0].id, 'MEMBER']
      )
    ).rejects.toThrow();
  });

  it('rejects duplicate email differing only by case', async () => {
    await expect(
      pool.query(
        "INSERT INTO users (full_name, email, password_hash, role) VALUES ('Case Dup', 'S1@EXAMPLE.COM', 'hash', 'STUDENT')"
      )
    ).rejects.toThrow();
  });

  it('rejects milestone is_completed true with null completed_at', async () => {
    await expect(
      pool.query(
        `INSERT INTO milestones (project_id, title, is_completed, completed_at)
         VALUES ($1, 'Bad Milestone', true, NULL)`,
        [projectId]
      )
    ).rejects.toThrow();
  });

  // Positive tests (one per table)
  it('positive: inserts a valid user', async () => {
    const res = await pool.query(
      "INSERT INTO users (full_name, email, password_hash, role, registration_number) VALUES ('Valid User', 'valid@example.com', 'hash', 'STUDENT', 'REG001') RETURNING id, role"
    );
    expect(res.rows[0].id).toBeDefined();
    expect(res.rows[0].role).toBe('STUDENT');
  });

  it('positive: inserts a valid project', async () => {
    const res = await pool.query(
      `INSERT INTO projects (title, description, created_by, guide_id, status, completed_at)
       VALUES ('Completed Project', 'Valid Desc', $1, $2, 'COMPLETED', now()) RETURNING id, status`,
      [studentId, guideId]
    );
    expect(res.rows[0].id).toBeDefined();
    expect(res.rows[0].status).toBe('COMPLETED');
  });

  it('positive: inserts a valid project_member', async () => {
    const sPos = await pool.query(
      "INSERT INTO users (full_name, email, password_hash, role) VALUES ('Positive Student', 'spos@example.com', 'hash', 'STUDENT') RETURNING id"
    );
    const res = await pool.query(
      'INSERT INTO project_members (project_id, student_id, membership_role) VALUES ($1, $2, $3) RETURNING id, membership_role',
      [projectId, sPos.rows[0].id, 'MEMBER']
    );
    expect(res.rows[0].id).toBeDefined();
    expect(res.rows[0].membership_role).toBe('MEMBER');
  });

  it('positive: inserts a valid milestone', async () => {
    const res = await pool.query(
      `INSERT INTO milestones (project_id, title, description, due_date, is_completed, completed_at)
       VALUES ($1, 'Valid Milestone', 'Description', '2026-12-31', true, now()) RETURNING id, is_completed`,
      [projectId]
    );
    expect(res.rows[0].id).toBeDefined();
    expect(res.rows[0].is_completed).toBe(true);
  });

  it('positive: inserts valid project_feedback', async () => {
    const res = await pool.query(
      `INSERT INTO project_feedback (project_id, faculty_id, message, feedback_type)
       VALUES ($1, $2, 'Great progress on milestone 1', 'APPROVAL') RETURNING id, feedback_type`,
      [projectId, facultyId]
    );
    expect(res.rows[0].id).toBeDefined();
    expect(res.rows[0].feedback_type).toBe('APPROVAL');
  });

  it('positive: inserts valid project_status_history', async () => {
    const res = await pool.query(
      `INSERT INTO project_status_history (project_id, previous_status, new_status, changed_by, reason)
       VALUES ($1, 'DRAFT', 'PENDING_REVIEW', $2, 'Initial review submission') RETURNING id, new_status`,
      [projectId, studentId]
    );
    expect(res.rows[0].id).toBeDefined();
    expect(res.rows[0].new_status).toBe('PENDING_REVIEW');
  });

  it('positive: inserts valid session', async () => {
    const res = await pool.query(
      `INSERT INTO session (sid, sess, expire)
       VALUES ('sess_123456789', '{"cookie":{"originalMaxAge":null,"expires":null,"httpOnly":true,"path":"/"},"user":{"id":"test"}}', now() + interval '1 day') RETURNING sid`,
      []
    );
    expect(res.rows[0].sid).toBe('sess_123456789');
  });
});
