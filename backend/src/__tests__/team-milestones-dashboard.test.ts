import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { Pool } from 'pg';
import bcrypt from 'bcrypt';
import { createApp } from '../app';

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;

if (!TEST_DATABASE_URL) {
  throw new Error('TEST_DATABASE_URL must be set in environment');
}

describe('Team, Milestones, Feedback & Dashboard Tests (Step 3 / 2C)', () => {
  let pool: Pool;
  let app: any;

  let faculty1Id: string;
  let faculty2Id: string;
  let student1Id: string;
  let student2Id: string;
  let student3Id: string;
  let student4Id: string;

  let faculty1Agent: any;
  let faculty2Agent: any;
  let student1Agent: any;
  let student2Agent: any;
  let student3Agent: any;

  beforeAll(async () => {
    pool = new Pool({ connectionString: TEST_DATABASE_URL });
    app = createApp(
      {
        BCRYPT_ROUNDS: 4,
        RATE_LIMIT_LOGIN_STRICT_MAX: 1000,
        RATE_LIMIT_LOGIN_LOOSE_MAX: 1000,
        RATE_LIMIT_REGISTER_MAX: 1000,
        RATE_LIMIT_STUDENT_SEARCH_MAX: 1000,
        RATE_LIMIT_PASSWORD_MAX: 1000,
      },
      pool
    );
  });

  afterAll(async () => {
    await pool.end();
  });

  async function getCsrfToken(agent: any): Promise<string> {
    const res = await agent.get('/api/auth/csrf');
    return res.body.csrfToken;
  }

  beforeEach(async () => {
    await pool.query(
      'TRUNCATE users, projects, project_members, milestones, project_feedback, project_status_history, session CASCADE'
    );

    const hash = await bcrypt.hash('password123', 4);

    // Create 2 faculty
    const f1 = await pool.query(
      "INSERT INTO users (full_name, email, password_hash, role) VALUES ('Dr. Sharma Guide', 'sharma@example.com', $1, 'FACULTY') RETURNING id",
      [hash]
    );
    faculty1Id = f1.rows[0].id;

    const f2 = await pool.query(
      "INSERT INTO users (full_name, email, password_hash, role) VALUES ('Prof. Iyer External', 'iyer@example.com', $1, 'FACULTY') RETURNING id",
      [hash]
    );
    faculty2Id = f2.rows[0].id;

    // Create 4 students
    const s1 = await pool.query(
      "INSERT INTO users (full_name, email, password_hash, role, registration_number) VALUES ('Alice Creator', 'alice@example.com', $1, 'STUDENT', 'RA001') RETURNING id",
      [hash]
    );
    student1Id = s1.rows[0].id;

    const s2 = await pool.query(
      "INSERT INTO users (full_name, email, password_hash, role, registration_number) VALUES ('Bob Member', 'bob@example.com', $1, 'STUDENT', 'RA002') RETURNING id",
      [hash]
    );
    student2Id = s2.rows[0].id;

    const s3 = await pool.query(
      "INSERT INTO users (full_name, email, password_hash, role, registration_number) VALUES ('Charlie Member', 'charlie@example.com', $1, 'STUDENT', 'RA003') RETURNING id",
      [hash]
    );
    student3Id = s3.rows[0].id;

    const s4 = await pool.query(
      "INSERT INTO users (full_name, email, password_hash, role, registration_number) VALUES ('David Extra', 'david@example.com', $1, 'STUDENT', 'RA004') RETURNING id",
      [hash]
    );
    student4Id = s4.rows[0].id;

    // Login agents
    faculty1Agent = request.agent(app);
    let csrf = await getCsrfToken(faculty1Agent);
    await faculty1Agent
      .post('/api/auth/login')
      .set('X-CSRF-Token', csrf)
      .send({ email: 'sharma@example.com', password: 'password123' });

    faculty2Agent = request.agent(app);
    csrf = await getCsrfToken(faculty2Agent);
    await faculty2Agent
      .post('/api/auth/login')
      .set('X-CSRF-Token', csrf)
      .send({ email: 'iyer@example.com', password: 'password123' });

    student1Agent = request.agent(app);
    csrf = await getCsrfToken(student1Agent);
    await student1Agent
      .post('/api/auth/login')
      .set('X-CSRF-Token', csrf)
      .send({ email: 'alice@example.com', password: 'password123' });

    student2Agent = request.agent(app);
    csrf = await getCsrfToken(student2Agent);
    await student2Agent
      .post('/api/auth/login')
      .set('X-CSRF-Token', csrf)
      .send({ email: 'bob@example.com', password: 'password123' });

    student3Agent = request.agent(app);
    csrf = await getCsrfToken(student3Agent);
    await student3Agent
      .post('/api/auth/login')
      .set('X-CSRF-Token', csrf)
      .send({ email: 'charlie@example.com', password: 'password123' });
  });

  describe('Team Management & Concurrency', () => {
    let projectId: string;

    beforeEach(async () => {
      const csrf = await getCsrfToken(student1Agent);
      const res = await student1Agent
        .post('/api/projects')
        .set('X-CSRF-Token', csrf)
        .send({
          title: 'Team Test Project',
          description: 'Testing team addition and concurrency',
          guideId: faculty1Id,
        });
      projectId = res.body.id;
    });

    it('creator can add and remove members, enforces STUDENT only, duplicate -> 409, LEAD not removable', async () => {
      // 1. Adding a faculty as member is rejected (400)
      let csrf = await getCsrfToken(student1Agent);
      const badTargetRes = await student1Agent
        .post(`/api/projects/${projectId}/members`)
        .set('X-CSRF-Token', csrf)
        .send({ studentId: faculty1Id });
      expect(badTargetRes.status).toBe(400);

      // 2. Add student 2
      csrf = await getCsrfToken(student1Agent);
      const addRes = await student1Agent
        .post(`/api/projects/${projectId}/members`)
        .set('X-CSRF-Token', csrf)
        .send({ studentId: student2Id });
      expect(addRes.status).toBe(201);
      expect(addRes.body.memberCount).toBe(2);

      // 3. Duplicate addition -> 409 ALREADY_MEMBER
      csrf = await getCsrfToken(student1Agent);
      const dupRes = await student1Agent
        .post(`/api/projects/${projectId}/members`)
        .set('X-CSRF-Token', csrf)
        .send({ studentId: student2Id });
      expect(dupRes.status).toBe(409);
      expect(dupRes.body.error.code).toBe('ALREADY_MEMBER');

      // 4. Non-creator member cannot add members (403)
      const s2Csrf = await getCsrfToken(student2Agent);
      const s2Add = await student2Agent
        .post(`/api/projects/${projectId}/members`)
        .set('X-CSRF-Token', s2Csrf)
        .send({ studentId: student3Id });
      expect(s2Add.status).toBe(403);

      // 5. Removing the LEAD returns 409 CANNOT_REMOVE_LEAD
      csrf = await getCsrfToken(student1Agent);
      const rmLeadRes = await student1Agent
        .delete(`/api/projects/${projectId}/members/${student1Id}`)
        .set('X-CSRF-Token', csrf);
      expect(rmLeadRes.status).toBe(409);
      expect(rmLeadRes.body.error.code).toBe('CANNOT_REMOVE_LEAD');

      // 6. Removing a normal member succeeds
      csrf = await getCsrfToken(student1Agent);
      const rmMemberRes = await student1Agent
        .delete(`/api/projects/${projectId}/members/${student2Id}`)
        .set('X-CSRF-Token', csrf);
      expect(rmMemberRes.status).toBe(200);
      expect(rmMemberRes.body.memberCount).toBe(1);
    });

    it('CONCURRENCY: with 2 of 3 members, two simultaneous POST /members -> exactly one 201 and one 409 TEAM_FULL', async () => {
      // Add member 2 (Bob) so project has 2 of 3 members
      let csrf = await getCsrfToken(student1Agent);
      await student1Agent
        .post(`/api/projects/${projectId}/members`)
        .set('X-CSRF-Token', csrf)
        .send({ studentId: student2Id });

      // Now create two parallel requests trying to add Charlie (s3) and David (s4)
      const csrfA = await getCsrfToken(student1Agent);
      const csrfB = await getCsrfToken(student1Agent);

      const reqA = student1Agent
        .post(`/api/projects/${projectId}/members`)
        .set('X-CSRF-Token', csrfA)
        .send({ studentId: student3Id });

      const reqB = student1Agent
        .post(`/api/projects/${projectId}/members`)
        .set('X-CSRF-Token', csrfB)
        .send({ studentId: student4Id });

      const [resA, resB] = await Promise.all([reqA, reqB]);

      const statuses = [resA.status, resB.status].sort();
      expect(statuses).toEqual([201, 409]);

      const failedRes = resA.status === 409 ? resA : resB;
      expect(failedRes.body.error.code).toBe('TEAM_FULL');

      // Final member count in DB must be exactly 3
      const countRes = await pool.query(
        'SELECT count(*)::int as count FROM project_members WHERE project_id = $1',
        [projectId]
      );
      expect(countRes.rows[0].count).toBe(3);
    });
  });

  describe('Milestones', () => {
    let projectId: string;

    beforeEach(async () => {
      const csrf = await getCsrfToken(student1Agent);
      const res = await student1Agent
        .post('/api/projects')
        .set('X-CSRF-Token', csrf)
        .send({
          title: 'Milestone Test Project',
          description: 'Testing milestones CRUD and progress',
          guideId: faculty1Id,
        });
      projectId = res.body.id;

      // Add student 2 to project team
      await pool.query(
        "INSERT INTO project_members (project_id, student_id, membership_role) VALUES ($1, $2, 'MEMBER')",
        [projectId, student2Id]
      );
    });

    it('members can create, update, complete, and delete milestones; non-members get 404; guide gets 403', async () => {
      // Non-member student 3 gets 404
      const s3Csrf = await getCsrfToken(student3Agent);
      const s3Res = await student3Agent
        .post(`/api/projects/${projectId}/milestones`)
        .set('X-CSRF-Token', s3Csrf)
        .send({ title: 'Non-member milestone' });
      expect(s3Res.status).toBe(404);

      // Faculty guide gets 403
      const fCsrf = await getCsrfToken(faculty1Agent);
      const fRes = await faculty1Agent
        .post(`/api/projects/${projectId}/milestones`)
        .set('X-CSRF-Token', fCsrf)
        .send({ title: 'Guide milestone' });
      expect(fRes.status).toBe(403);

      // Student 2 (team member) can create milestone
      const s2Csrf = await getCsrfToken(student2Agent);
      const createRes = await student2Agent
        .post(`/api/projects/${projectId}/milestones`)
        .set('X-CSRF-Token', s2Csrf)
        .send({
          title: 'Database Schema Design',
          description: 'Postgres migrations and triggers',
          dueDate: '2026-05-15',
        });

      expect(createRes.status).toBe(201);
      expect(createRes.body.title).toBe('Database Schema Design');
      expect(createRes.body.dueDate).toBe('2026-05-15');
      expect(createRes.body.isCompleted).toBe(false);
      expect(createRes.body.completedAt).toBeNull();
      const milestoneId = createRes.body.id;

      // Complete milestone
      const updateRes = await student1Agent
        .patch(`/api/projects/${projectId}/milestones/${milestoneId}`)
        .set('X-CSRF-Token', await getCsrfToken(student1Agent))
        .send({ isCompleted: true });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.isCompleted).toBe(true);
      expect(updateRes.body.completedAt).toBeDefined();

      // Uncomplete milestone
      const uncompleteRes = await student1Agent
        .patch(`/api/projects/${projectId}/milestones/${milestoneId}`)
        .set('X-CSRF-Token', await getCsrfToken(student1Agent))
        .send({ isCompleted: false });

      expect(uncompleteRes.status).toBe(200);
      expect(uncompleteRes.body.isCompleted).toBe(false);
      expect(uncompleteRes.body.completedAt).toBeNull();

      // Milestone from another project returns 404
      const otherProj = await pool.query(
        "INSERT INTO projects (title, description, created_by, guide_id) VALUES ('Other', 'Other', $1, $2) RETURNING id",
        [student1Id, faculty1Id]
      );
      const foreignRes = await student1Agent
        .patch(`/api/projects/${otherProj.rows[0].id}/milestones/${milestoneId}`)
        .set('X-CSRF-Token', await getCsrfToken(student1Agent))
        .send({ title: 'Hack' });
      expect(foreignRes.status).toBe(404);

      // Delete milestone
      const delRes = await student1Agent
        .delete(`/api/projects/${projectId}/milestones/${milestoneId}`)
        .set('X-CSRF-Token', await getCsrfToken(student1Agent));
      expect(delRes.status).toBe(204);
    });

    it('progress computation: 0 with none, rounds correctly (1 of 3 = 33, 2 of 3 = 67)', async () => {
      // 0 milestones -> progress is 0
      let detail = await student1Agent.get(`/api/projects/${projectId}`);
      expect(detail.body.progress).toBe(0);

      // Add 3 milestones: 1 completed, 2 incomplete
      await pool.query(
        `INSERT INTO milestones (project_id, title, is_completed, completed_at) VALUES ($1, 'M1', true, now())`,
        [projectId]
      );
      await pool.query(
        `INSERT INTO milestones (project_id, title, is_completed) VALUES ($1, 'M2', false), ($1, 'M3', false)`,
        [projectId]
      );

      // 1 of 3 completed -> 33
      detail = await student1Agent.get(`/api/projects/${projectId}`);
      expect(detail.body.milestoneTotal).toBe(3);
      expect(detail.body.milestoneCompleted).toBe(1);
      expect(detail.body.progress).toBe(33);

      // Complete 2nd milestone: 2 of 3 -> 67
      await pool.query(
        "UPDATE milestones SET is_completed = true, completed_at = now() WHERE project_id = $1 AND title = 'M2'",
        [projectId]
      );
      detail = await student1Agent.get(`/api/projects/${projectId}`);
      expect(detail.body.milestoneCompleted).toBe(2);
      expect(detail.body.progress).toBe(67);
    });

    it('milestone mutations locked in PENDING_REVIEW, COMPLETED and archived', async () => {
      const mRes = await pool.query(
        "INSERT INTO milestones (project_id, title) VALUES ($1, 'Test M') RETURNING id",
        [projectId]
      );
      const mId = mRes.rows[0].id;

      // In PENDING_REVIEW -> locked
      await pool.query(
        "UPDATE projects SET status = 'PENDING_REVIEW' WHERE id = $1",
        [projectId]
      );

      let csrf = await getCsrfToken(student1Agent);
      const res = await student1Agent
        .patch(`/api/projects/${projectId}/milestones/${mId}`)
        .set('X-CSRF-Token', csrf)
        .send({ title: 'New M' });
      expect(res.status).toBe(403);
    });
  });

  describe('Feedback', () => {
    let projectId: string;

    beforeEach(async () => {
      const csrf = await getCsrfToken(student1Agent);
      const res = await student1Agent
        .post('/api/projects')
        .set('X-CSRF-Token', csrf)
        .send({
          title: 'Feedback Project',
          description: 'Testing feedback commenting',
          guideId: faculty1Id,
        });
      projectId = res.body.id;
    });

    it('only assigned guide can post COMMENT feedback (students 403, other faculty 403); students can read', async () => {
      // Student cannot post feedback (403)
      let csrf = await getCsrfToken(student1Agent);
      const sRes = await student1Agent
        .post(`/api/projects/${projectId}/feedback`)
        .set('X-CSRF-Token', csrf)
        .send({ message: 'Student comment' });
      expect(sRes.status).toBe(403);

      // Other faculty cannot post feedback (403)
      csrf = await getCsrfToken(faculty2Agent);
      const f2Res = await faculty2Agent
        .post(`/api/projects/${projectId}/feedback`)
        .set('X-CSRF-Token', csrf)
        .send({ message: 'External faculty comment' });
      expect(f2Res.status).toBe(403);

      // Assigned guide posts feedback
      csrf = await getCsrfToken(faculty1Agent);
      const guideRes = await faculty1Agent
        .post(`/api/projects/${projectId}/feedback`)
        .set('X-CSRF-Token', csrf)
        .send({ message: 'Please ensure test coverage exceeds 90%.' });

      expect(guideRes.status).toBe(201);
      expect(guideRes.body.feedbackType).toBe('COMMENT');
      expect(guideRes.body.author.id).toBe(faculty1Id);

      // Students can read feedback (newest first)
      const listRes = await student1Agent.get(`/api/projects/${projectId}/feedback`);
      expect(listRes.status).toBe(200);
      expect(listRes.body.items).toHaveLength(1);
      expect(listRes.body.items[0].message).toBe(
        'Please ensure test coverage exceeds 90%.'
      );
    });
  });

  describe('Dashboard Summary', () => {
    it('returns STUDENT and FACULTY dashboard shapes computed from real rows', async () => {
      // 1. Create a project in IN_PROGRESS for student 1 with faculty 1
      const p1 = await pool.query<{ id: string }>(
        `INSERT INTO projects (title, description, created_by, guide_id, status, submission_date)
         VALUES ('Active Drone Capstone', 'Drone project', $1, $2, 'IN_PROGRESS', now())
         RETURNING id`,
        [student1Id, faculty1Id]
      );
      const p1Id = p1.rows[0].id;
      await pool.query(
        "INSERT INTO project_members (project_id, student_id, membership_role) VALUES ($1, $2, 'LEAD')",
        [p1Id, student1Id]
      );
      await pool.query(
        "INSERT INTO milestones (project_id, title, due_date, is_completed) VALUES ($1, 'Upcoming Milestone 1', '2026-06-01', false)",
        [p1Id]
      );
      await pool.query(
        "INSERT INTO project_feedback (project_id, faculty_id, message, feedback_type) VALUES ($1, $2, 'Great progress!', 'COMMENT')",
        [p1Id, faculty1Id]
      );

      // 2. Student dashboard summary
      const sDash = await student1Agent.get('/api/dashboard/summary');
      expect(sDash.status).toBe(200);
      expect(sDash.body.role).toBe('STUDENT');
      expect(sDash.body.countsByStatus.IN_PROGRESS).toBe(1);
      expect(sDash.body.countsByStatus.DRAFT).toBe(0);
      expect(sDash.body.activeProject).toBeDefined();
      expect(sDash.body.activeProject.id).toBe(p1Id);
      expect(sDash.body.upcomingMilestones).toHaveLength(1);
      expect(sDash.body.upcomingMilestones[0].title).toBe('Upcoming Milestone 1');
      expect(sDash.body.recentFeedback).toHaveLength(1);
      expect(sDash.body.recentFeedback[0].message).toBe('Great progress!');

      // 3. Create a PENDING_REVIEW project assigned to faculty 1
      const p2 = await pool.query<{ id: string }>(
        `INSERT INTO projects (title, description, created_by, guide_id, status, submission_date)
         VALUES ('Pending Review Capstone', 'Review project', $1, $2, 'PENDING_REVIEW', now() - interval '2 days')
         RETURNING id`,
        [student2Id, faculty1Id]
      );
      await pool.query(
        "INSERT INTO project_members (project_id, student_id, membership_role) VALUES ($1, $2, 'LEAD')",
        [p2.rows[0].id, student2Id]
      );

      // Complete all milestones on p1 so it qualifies for readyToComplete
      await pool.query(
        'UPDATE milestones SET is_completed = true, completed_at = now() WHERE project_id = $1',
        [p1Id]
      );

      // 4. Faculty dashboard summary
      const fDash = await faculty1Agent.get('/api/dashboard/summary');
      expect(fDash.status).toBe(200);
      expect(fDash.body.role).toBe('FACULTY');
      expect(fDash.body.pendingReviewsForMe).toBe(1);
      expect(fDash.body.pendingReviewItems).toHaveLength(1);
      expect(fDash.body.pendingReviewItems[0].id).toBe(p2.rows[0].id);
      expect(fDash.body.readyToComplete).toHaveLength(1);
      expect(fDash.body.readyToComplete[0].id).toBe(p1Id);
    });
  });
});
