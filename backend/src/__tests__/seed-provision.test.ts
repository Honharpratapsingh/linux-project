import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Pool } from 'pg';
import { runSeedDemo } from '../scripts/seedDemo';
import { runProvisionFaculty } from '../scripts/provisionFaculty';

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;

if (!TEST_DATABASE_URL) {
  throw new Error('TEST_DATABASE_URL must be set in environment');
}

describe('Seed and Provision Tests (Item 1.h)', () => {
  let pool: Pool;

  beforeAll(async () => {
    pool = new Pool({ connectionString: TEST_DATABASE_URL });
    // Clean test DB so seed runs fresh
    await pool.query(
      'TRUNCATE users, projects, project_members, milestones, project_feedback, project_status_history, session CASCADE'
    );
  });

  afterAll(async () => {
    await pool.end();
  });

  it('seedDemo: runs twice against test DB; first run seeds valid data, second run is no-op', async () => {
    // First run: seeds demo data
    const firstResult = await runSeedDemo(pool, 'DemoSecret123!');
    expect(firstResult.skipped).toBe(false);
    expect(firstResult.projectCount).toBeGreaterThan(0);

    // 1. Verify 3 faculty and 6 students created with @demo.projecthub.test
    const facultyRes = await pool.query<{ count: string }>(
      "SELECT count(*)::text as count FROM users WHERE role = 'FACULTY' AND email LIKE '%@demo.projecthub.test'"
    );
    expect(parseInt(facultyRes.rows[0].count, 10)).toBe(3);

    const studentRes = await pool.query<{ count: string }>(
      "SELECT count(*)::text as count FROM users WHERE role = 'STUDENT' AND email LIKE '%@demo.projecthub.test'"
    );
    expect(parseInt(studentRes.rows[0].count, 10)).toBe(6);

    // 2. Verify projects cover all six statuses
    const statusRes = await pool.query<{ status: string }>(
      `SELECT DISTINCT status FROM projects
       WHERE created_by IN (SELECT id FROM users WHERE email LIKE '%@demo.projecthub.test')`
    );
    const statuses = statusRes.rows.map((r) => r.status);
    const expectedStatuses = [
      'DRAFT',
      'PENDING_REVIEW',
      'CHANGES_REQUESTED',
      'REJECTED',
      'IN_PROGRESS',
      'COMPLETED',
    ];
    for (const exp of expectedStatuses) {
      expect(statuses).toContain(exp);
    }

    // 3. Verify no project has more than 3 members
    const memberCounts = await pool.query<{ project_id: string; member_count: string }>(
      'SELECT project_id, count(*)::text as member_count FROM project_members GROUP BY project_id'
    );
    for (const row of memberCounts.rows) {
      expect(parseInt(row.member_count, 10)).toBeLessThanOrEqual(3);
    }

    // 4. Verify all rows respect CHECK constraints (e.g. completed_at, archived_at, deleted_at)
    const checkViolations = await pool.query(`
      SELECT id FROM projects
      WHERE (status = 'COMPLETED' AND completed_at IS NULL)
         OR (status != 'COMPLETED' AND completed_at IS NOT NULL)
         OR (deleted_at IS NOT NULL AND archived_at IS NULL)
         OR (archived_at IS NULL AND archived_by IS NOT NULL)
         OR (archived_at IS NOT NULL AND archived_by IS NULL)
         OR (deleted_at IS NULL AND deleted_by IS NOT NULL)
         OR (deleted_at IS NOT NULL AND deleted_by IS NULL)
    `);
    expect(checkViolations.rows).toHaveLength(0);

    // Record user & project counts before 2nd run
    const usersBefore = await pool.query<{ count: string }>('SELECT count(*)::text as count FROM users');
    const projectsBefore = await pool.query<{ count: string }>('SELECT count(*)::text as count FROM projects');

    // Second run: no-op (idempotent)
    const secondResult = await runSeedDemo(pool, 'DemoSecret123!');
    expect(secondResult.skipped).toBe(true);
    expect(secondResult.projectCount).toBe(0);

    const usersAfter = await pool.query<{ count: string }>('SELECT count(*)::text as count FROM users');
    const projectsAfter = await pool.query<{ count: string }>('SELECT count(*)::text as count FROM projects');

    expect(usersAfter.rows[0].count).toBe(usersBefore.rows[0].count);
    expect(projectsAfter.rows[0].count).toBe(projectsBefore.rows[0].count);
  });

  it('provisionFaculty: creates FACULTY user, fails on duplicate email, and fails on short password', async () => {
    const email = 'new-dean@srmist.edu.in';
    const name = 'Dr. Dean Academic';

    // 1. Successful creation of FACULTY user
    const user = await runProvisionFaculty(pool, {
      name,
      email,
      password: 'StrongFacultyPassword123!',
    });
    expect(user.id).toBeDefined();
    expect(user.fullName).toBe(name);
    expect(user.email).toBe(email);
    expect(user.role).toBe('FACULTY');

    // Verify row in DB
    const dbUser = await pool.query(
      'SELECT id, role, full_name, email FROM users WHERE id = $1',
      [user.id]
    );
    expect(dbUser.rows).toHaveLength(1);
    expect(dbUser.rows[0].role).toBe('FACULTY');

    // 2. Fails on duplicate email
    await expect(
      runProvisionFaculty(pool, {
        name: 'Another Faculty',
        email,
        password: 'AnotherPassword123!',
      })
    ).rejects.toThrow(/already exists/);

    // 3. Fails on short password (< 8 chars)
    await expect(
      runProvisionFaculty(pool, {
        name: 'Prof Shortpass',
        email: 'shortpass@srmist.edu.in',
        password: 'short',
      })
    ).rejects.toThrow(/at least 8 characters/);
  });
});
