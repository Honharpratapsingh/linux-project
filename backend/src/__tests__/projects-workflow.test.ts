import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { Pool } from 'pg';
import bcrypt from 'bcrypt';
import { createApp } from '../app';

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;

if (!TEST_DATABASE_URL) {
  throw new Error('TEST_DATABASE_URL must be set in environment');
}

describe('Projects & Workflow Tests (Step 2 / 2B)', () => {
  let pool: Pool;
  let app: any;

  let faculty1Id: string;
  let faculty2Id: string;
  let student1Id: string;
  let student2Id: string;

  let faculty1Agent: any;
  let faculty2Agent: any;
  let student1Agent: any;
  let student2Agent: any;

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

    // Create 2 students
    const s1 = await pool.query(
      "INSERT INTO users (full_name, email, password_hash, role, registration_number) VALUES ('Alice Creator', 'alice@example.com', $1, 'STUDENT', 'RA001') RETURNING id",
      [hash]
    );
    student1Id = s1.rows[0].id;

    const s2 = await pool.query(
      "INSERT INTO users (full_name, email, password_hash, role, registration_number) VALUES ('Bob Other', 'bob@example.com', $1, 'STUDENT', 'RA002') RETURNING id",
      [hash]
    );
    student2Id = s2.rows[0].id;

    // Setup agents
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
  });

  describe('Project Creation & Visibility', () => {
    it('students can create project with valid faculty guide, auto-assigned LEAD', async () => {
      const csrf = await getCsrfToken(student1Agent);
      const res = await student1Agent
        .post('/api/projects')
        .set('X-CSRF-Token', csrf)
        .send({
          title: 'AI Robotics System',
          description: 'Autonomous robotics tracking platform',
          guideId: faculty1Id,
        });

      expect(res.status).toBe(201);
      expect(res.body.title).toBe('AI Robotics System');
      expect(res.body.status).toBe('DRAFT');
      expect(res.body.guide.id).toBe(faculty1Id);
      expect(res.body.createdBy.id).toBe(student1Id);
      expect(res.body.memberCount).toBe(1);
      expect(res.body.members).toHaveLength(1);
      expect(res.body.members[0].studentId).toBe(student1Id);
      expect(res.body.members[0].membershipRole).toBe('LEAD');
      expect(res.body.permissions.canEdit).toBe(true);
      expect(res.body.permissions.canSubmit).toBe(true);
    });

    it('rejects project creation by faculty with 403 FORBIDDEN', async () => {
      const csrf = await getCsrfToken(faculty1Agent);
      const res = await faculty1Agent
        .post('/api/projects')
        .set('X-CSRF-Token', csrf)
        .send({
          title: 'Faculty Project',
          description: 'Not allowed',
          guideId: faculty2Id,
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('rejects invalid or non-faculty guideId with 400 VALIDATION_ERROR', async () => {
      const csrf = await getCsrfToken(student1Agent);
      const res = await student1Agent
        .post('/api/projects')
        .set('X-CSRF-Token', csrf)
        .send({
          title: 'Valid Title',
          description: 'Valid Description',
          guideId: student2Id, // Student instead of Faculty
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('students see only their own projects; non-members get 404 (never 403); faculty see all', async () => {
      // Create project by student 1
      const csrf = await getCsrfToken(student1Agent);
      const createRes = await student1Agent
        .post('/api/projects')
        .set('X-CSRF-Token', csrf)
        .send({
          title: 'Secret Project',
          description: 'Only Alice can see this',
          guideId: faculty1Id,
        });
      const projectId = createRes.body.id;

      // Student 1 sees it
      const s1Res = await student1Agent.get(`/api/projects/${projectId}`);
      expect(s1Res.status).toBe(200);

      // Student 2 (non-member) gets 404 NOT_FOUND (never 403!)
      const s2Res = await student2Agent.get(`/api/projects/${projectId}`);
      expect(s2Res.status).toBe(404);
      expect(s2Res.body.error.code).toBe('NOT_FOUND');

      // Student 2 child routes also get 404
      const s2History = await student2Agent.get(`/api/projects/${projectId}/history`);
      expect(s2History.status).toBe(404);

      // Student 2 list query does NOT contain student 1's project
      const s2List = await student2Agent.get('/api/projects');
      expect(s2List.status).toBe(200);
      expect(s2List.body.items).toHaveLength(0);

      // Faculty 1 (guide) sees it
      const f1Res = await faculty1Agent.get(`/api/projects/${projectId}`);
      expect(f1Res.status).toBe(200);

      // Faculty 2 (non-guide faculty) also sees it in list and detail
      const f2Res = await faculty2Agent.get(`/api/projects/${projectId}`);
      expect(f2Res.status).toBe(200);
      const f2List = await faculty2Agent.get('/api/projects');
      expect(f2List.status).toBe(200);
      expect(f2List.body.items).toHaveLength(1);
    });
  });

  describe('Workflow Transitions & Permissions', () => {
    let projectId: string;

    beforeEach(async () => {
      const csrf = await getCsrfToken(student1Agent);
      const res = await student1Agent
        .post('/api/projects')
        .set('X-CSRF-Token', csrf)
        .send({
          title: 'Full Workflow Project',
          description: 'Testing state machine transitions',
          guideId: faculty1Id,
        });
      projectId = res.body.id;
    });

    it('submit: DRAFT -> PENDING_REVIEW by creator sets submission_date and writes history', async () => {
      const csrf = await getCsrfToken(student1Agent);
      const res = await student1Agent
        .post(`/api/projects/${projectId}/submit`)
        .set('X-CSRF-Token', csrf);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('PENDING_REVIEW');
      expect(res.body.submissionDate).toBeDefined();

      // Check history
      const historyRes = await student1Agent.get(`/api/projects/${projectId}/history`);
      expect(historyRes.status).toBe(200);
      expect(historyRes.body.items).toHaveLength(2); // null->DRAFT, DRAFT->PENDING_REVIEW
      expect(historyRes.body.items[1].previousStatus).toBe('DRAFT');
      expect(historyRes.body.items[1].newStatus).toBe('PENDING_REVIEW');
    });

    it('non-creator cannot submit (403 FORBIDDEN)', async () => {
      // Add student 2 as member directly in DB
      await pool.query(
        "INSERT INTO project_members (project_id, student_id, membership_role) VALUES ($1, $2, 'MEMBER')",
        [projectId, student2Id]
      );

      const csrf = await getCsrfToken(student2Agent);
      const res = await student2Agent
        .post(`/api/projects/${projectId}/submit`)
        .set('X-CSRF-Token', csrf);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('request-changes: requires non-empty message, transitions to CHANGES_REQUESTED and creates feedback', async () => {
      // Submit first
      let csrf = await getCsrfToken(student1Agent);
      await student1Agent
        .post(`/api/projects/${projectId}/submit`)
        .set('X-CSRF-Token', csrf);

      // Request changes without message -> 400
      csrf = await getCsrfToken(faculty1Agent);
      const badRes = await faculty1Agent
        .post(`/api/projects/${projectId}/request-changes`)
        .set('X-CSRF-Token', csrf)
        .send({});
      expect(badRes.status).toBe(400);

      // Non-guide faculty cannot request changes (403)
      const f2Csrf = await getCsrfToken(faculty2Agent);
      const f2Res = await faculty2Agent
        .post(`/api/projects/${projectId}/request-changes`)
        .set('X-CSRF-Token', f2Csrf)
        .send({ message: 'Fix methodology' });
      expect(f2Res.status).toBe(403);

      // Guide requests changes successfully
      const goodRes = await faculty1Agent
        .post(`/api/projects/${projectId}/request-changes`)
        .set('X-CSRF-Token', csrf)
        .send({ message: 'Please update chapter 2 and add diagrams' });

      expect(goodRes.status).toBe(200);
      expect(goodRes.body.status).toBe('CHANGES_REQUESTED');

      // Verify feedback was inserted
      const fb = await pool.query(
        'SELECT message, feedback_type FROM project_feedback WHERE project_id = $1',
        [projectId]
      );
      expect(fb.rows).toHaveLength(1);
      expect(fb.rows[0].message).toBe('Please update chapter 2 and add diagrams');
      expect(fb.rows[0].feedback_type).toBe('CHANGES_REQUESTED');
    });

    it('reject: requires message, transitions to REJECTED and creates feedback; resubmission allowed', async () => {
      // Submit first
      let csrf = await getCsrfToken(student1Agent);
      await student1Agent
        .post(`/api/projects/${projectId}/submit`)
        .set('X-CSRF-Token', csrf);

      // Reject by guide
      csrf = await getCsrfToken(faculty1Agent);
      const rejectRes = await faculty1Agent
        .post(`/api/projects/${projectId}/reject`)
        .set('X-CSRF-Token', csrf)
        .send({ message: 'Scope is out of curriculum bounds' });

      expect(rejectRes.status).toBe(200);
      expect(rejectRes.body.status).toBe('REJECTED');

      // Resubmission from REJECTED is allowed
      csrf = await getCsrfToken(student1Agent);
      const resubmitRes = await student1Agent
        .post(`/api/projects/${projectId}/submit`)
        .set('X-CSRF-Token', csrf);

      expect(resubmitRes.status).toBe(200);
      expect(resubmitRes.body.status).toBe('PENDING_REVIEW');
    });

    it('a student and a non-guide faculty each get 403 on approve, reject, request-changes and complete', async () => {
      // Transition project to PENDING_REVIEW first so actions are state-valid for the guide
      let csrf = await getCsrfToken(student1Agent);
      await student1Agent
        .post(`/api/projects/${projectId}/submit`)
        .set('X-CSRF-Token', csrf);

      const endpoints = ['approve', 'reject', 'request-changes', 'complete'];

      // Student attempt on all 4 endpoints returns 403
      for (const ep of endpoints) {
        csrf = await getCsrfToken(student1Agent);
        const res = await student1Agent
          .post(`/api/projects/${projectId}/${ep}`)
          .set('X-CSRF-Token', csrf)
          .send({ message: 'student attempt' });
        expect(res.status).toBe(403);
        expect(res.body.error.code).toBe('FORBIDDEN');
      }

      // Non-guide faculty attempt on all 4 endpoints returns 403
      for (const ep of endpoints) {
        csrf = await getCsrfToken(faculty2Agent);
        const res = await faculty2Agent
          .post(`/api/projects/${projectId}/${ep}`)
          .set('X-CSRF-Token', csrf)
          .send({ message: 'non-guide faculty attempt' });
        expect(res.status).toBe(403);
        expect(res.body.error.code).toBe('FORBIDDEN');
      }
    });

    it('approve: transitions to IN_PROGRESS, creates APPROVAL feedback with default message if omitted', async () => {
      // Submit first
      let csrf = await getCsrfToken(student1Agent);
      await student1Agent
        .post(`/api/projects/${projectId}/submit`)
        .set('X-CSRF-Token', csrf);

      // Approve without message
      csrf = await getCsrfToken(faculty1Agent);
      const approveRes = await faculty1Agent
        .post(`/api/projects/${projectId}/approve`)
        .set('X-CSRF-Token', csrf)
        .send({});

      expect(approveRes.status).toBe(200);
      expect(approveRes.body.status).toBe('IN_PROGRESS');

      // Verify default approval feedback
      const fb = await pool.query(
        'SELECT message, feedback_type FROM project_feedback WHERE project_id = $1',
        [projectId]
      );
      expect(fb.rows).toHaveLength(1);
      expect(fb.rows[0].message).toBe('Project approved.');
      expect(fb.rows[0].feedback_type).toBe('APPROVAL');
    });

    it('invalid transitions return 409 INVALID_STATE', async () => {
      // DRAFT -> approve returns 409
      const csrf = await getCsrfToken(faculty1Agent);
      const res = await faculty1Agent
        .post(`/api/projects/${projectId}/approve`)
        .set('X-CSRF-Token', csrf)
        .send({});

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('INVALID_STATE');
    });

    it('completion gates: 0 milestones -> NO_MILESTONES; incomplete -> INCOMPLETE_MILESTONES; all complete -> 200', async () => {
      // Fast forward project to IN_PROGRESS
      await pool.query(
        "UPDATE projects SET status = 'IN_PROGRESS' WHERE id = $1",
        [projectId]
      );

      // 1. Try complete with 0 milestones -> 409 NO_MILESTONES
      let csrf = await getCsrfToken(faculty1Agent);
      const c1 = await faculty1Agent
        .post(`/api/projects/${projectId}/complete`)
        .set('X-CSRF-Token', csrf)
        .send({ message: 'Attempt completion' });

      expect(c1.status).toBe(409);
      expect(c1.body.error.code).toBe('COMPLETION_BLOCKED');
      expect(c1.body.error.details.completionBlockedReason).toBe('NO_MILESTONES');

      // 2. Add an incomplete milestone
      await pool.query(
        "INSERT INTO milestones (project_id, title, is_completed) VALUES ($1, 'Milestone 1', false)",
        [projectId]
      );

      // Try complete with incomplete milestone -> 409 INCOMPLETE_MILESTONES
      csrf = await getCsrfToken(faculty1Agent);
      const c2 = await faculty1Agent
        .post(`/api/projects/${projectId}/complete`)
        .set('X-CSRF-Token', csrf)
        .send({});

      expect(c2.status).toBe(409);
      expect(c2.body.error.code).toBe('COMPLETION_BLOCKED');
      expect(c2.body.error.details.completionBlockedReason).toBe('INCOMPLETE_MILESTONES');

      // 3. Mark milestone as complete
      await pool.query(
        'UPDATE milestones SET is_completed = true, completed_at = now() WHERE project_id = $1',
        [projectId]
      );

      // Complete succeeds!
      csrf = await getCsrfToken(faculty1Agent);
      const c3 = await faculty1Agent
        .post(`/api/projects/${projectId}/complete`)
        .set('X-CSRF-Token', csrf)
        .send({ message: 'Excellent capstone work!' });

      expect(c3.status).toBe(200);
      expect(c3.body.status).toBe('COMPLETED');
      expect(c3.body.completedAt).toBeDefined();

      // COMPLETED is terminal: trying to submit or approve returns 409
      csrf = await getCsrfToken(student1Agent);
      const termRes = await student1Agent
        .post(`/api/projects/${projectId}/submit`)
        .set('X-CSRF-Token', csrf);
      expect(termRes.status).toBe(409);
      expect(termRes.body.error.code).toBe('INVALID_STATE');
    });
  });

  describe('Edit, Archive, Restore & Soft Delete', () => {
    let projectId: string;

    beforeEach(async () => {
      const csrf = await getCsrfToken(student1Agent);
      const res = await student1Agent
        .post('/api/projects')
        .set('X-CSRF-Token', csrf)
        .send({
          title: 'Project for Archive Tests',
          description: 'Testing lifecycle',
          guideId: faculty1Id,
        });
      projectId = res.body.id;
    });

    it('creator can edit title, description, and guide in DRAFT; non-creator cannot', async () => {
      let csrf = await getCsrfToken(student1Agent);
      const res = await student1Agent
        .patch(`/api/projects/${projectId}`)
        .set('X-CSRF-Token', csrf)
        .send({
          title: 'Updated Title',
          description: 'Updated Description',
          guideId: faculty2Id,
        });

      expect(res.status).toBe(200);
      expect(res.body.title).toBe('Updated Title');
      expect(res.body.guide.id).toBe(faculty2Id);

      // In PENDING_REVIEW, editing is locked (403)
      await pool.query(
        "UPDATE projects SET status = 'PENDING_REVIEW' WHERE id = $1",
        [projectId]
      );

      csrf = await getCsrfToken(student1Agent);
      const editLocked = await student1Agent
        .patch(`/api/projects/${projectId}`)
        .set('X-CSRF-Token', csrf)
        .send({ title: 'New Locked Title' });
      expect(editLocked.status).toBe(403);
    });

    it('a non-creator member cannot edit or submit a project', async () => {
      // Add student 2 (Bob) as a MEMBER of the project
      await pool.query(
        "INSERT INTO project_members (project_id, student_id, membership_role) VALUES ($1, $2, 'MEMBER')",
        [projectId, student2Id]
      );

      // Non-creator member tries to edit project -> 403 FORBIDDEN
      let csrf = await getCsrfToken(student2Agent);
      const editRes = await student2Agent
        .patch(`/api/projects/${projectId}`)
        .set('X-CSRF-Token', csrf)
        .send({ title: 'Hacked Title by Member' });
      expect(editRes.status).toBe(403);
      expect(editRes.body.error.code).toBe('FORBIDDEN');

      // Non-creator member tries to submit project -> 403 FORBIDDEN
      csrf = await getCsrfToken(student2Agent);
      const submitRes = await student2Agent
        .post(`/api/projects/${projectId}/submit`)
        .set('X-CSRF-Token', csrf);
      expect(submitRes.status).toBe(403);
      expect(submitRes.body.error.code).toBe('FORBIDDEN');
    });

    it('the creator cannot archive a non-DRAFT project; the guide cannot archive a DRAFT', async () => {
      // 1. While project is DRAFT: guide cannot archive DRAFT (403)
      let csrf = await getCsrfToken(faculty1Agent);
      const guideDraftArch = await faculty1Agent
        .patch(`/api/projects/${projectId}/archive`)
        .set('X-CSRF-Token', csrf);
      expect(guideDraftArch.status).toBe(403);
      expect(guideDraftArch.body.error.code).toBe('FORBIDDEN');

      // 2. Transition project to PENDING_REVIEW: creator cannot archive non-DRAFT (403)
      csrf = await getCsrfToken(student1Agent);
      await student1Agent
        .post(`/api/projects/${projectId}/submit`)
        .set('X-CSRF-Token', csrf);

      csrf = await getCsrfToken(student1Agent);
      const creatorNonDraftArch1 = await student1Agent
        .patch(`/api/projects/${projectId}/archive`)
        .set('X-CSRF-Token', csrf);
      expect(creatorNonDraftArch1.status).toBe(403);
      expect(creatorNonDraftArch1.body.error.code).toBe('FORBIDDEN');

      // 3. Guide transitions to IN_PROGRESS: creator cannot archive IN_PROGRESS (403)
      csrf = await getCsrfToken(faculty1Agent);
      await faculty1Agent
        .post(`/api/projects/${projectId}/approve`)
        .set('X-CSRF-Token', csrf);

      csrf = await getCsrfToken(student1Agent);
      const creatorNonDraftArch2 = await student1Agent
        .patch(`/api/projects/${projectId}/archive`)
        .set('X-CSRF-Token', csrf);
      expect(creatorNonDraftArch2.status).toBe(403);
      expect(creatorNonDraftArch2.body.error.code).toBe('FORBIDDEN');
    });

    it('archive & restore rules: creator archives DRAFT; guide archives COMPLETED/REJECTED; creator cannot restore guide-archived REJECTED', async () => {
      // 1. Creator archives own DRAFT
      let csrf = await getCsrfToken(student1Agent);
      const archRes = await student1Agent
        .patch(`/api/projects/${projectId}/archive`)
        .set('X-CSRF-Token', csrf);

      expect(archRes.status).toBe(200);
      expect(archRes.body.archivedAt).toBeDefined();
      expect(archRes.body.status).toBe('DRAFT'); // Status unchanged!

      // Archived project rejects any edit with 409 PROJECT_ARCHIVED
      csrf = await getCsrfToken(student1Agent);
      const badEdit = await student1Agent
        .patch(`/api/projects/${projectId}`)
        .set('X-CSRF-Token', csrf)
        .send({ title: 'Edit Archived' });
      expect(badEdit.status).toBe(409);
      expect(badEdit.body.error.code).toBe('PROJECT_ARCHIVED');

      // Creator restores own DRAFT
      csrf = await getCsrfToken(student1Agent);
      const restRes = await student1Agent
        .patch(`/api/projects/${projectId}/restore`)
        .set('X-CSRF-Token', csrf);
      expect(restRes.status).toBe(200);
      expect(restRes.body.archivedAt).toBeNull();

      // 2. Guide archives REJECTED project
      await pool.query(
        "UPDATE projects SET status = 'REJECTED' WHERE id = $1",
        [projectId]
      );

      // Creator CANNOT archive REJECTED
      csrf = await getCsrfToken(student1Agent);
      const badArch = await student1Agent
        .patch(`/api/projects/${projectId}/archive`)
        .set('X-CSRF-Token', csrf);
      expect(badArch.status).toBe(403);

      // Guide CAN archive REJECTED
      csrf = await getCsrfToken(faculty1Agent);
      const guideArch = await faculty1Agent
        .patch(`/api/projects/${projectId}/archive`)
        .set('X-CSRF-Token', csrf);
      expect(guideArch.status).toBe(200);
      expect(guideArch.body.archivedAt).toBeDefined();

      // Creator CANNOT restore guide-archived REJECTED project
      csrf = await getCsrfToken(student1Agent);
      const creatorRestore = await student1Agent
        .patch(`/api/projects/${projectId}/restore`)
        .set('X-CSRF-Token', csrf);
      expect(creatorRestore.status).toBe(403);

      // Guide CAN restore REJECTED project
      csrf = await getCsrfToken(faculty1Agent);
      const guideRestore = await faculty1Agent
        .patch(`/api/projects/${projectId}/restore`)
        .set('X-CSRF-Token', csrf);
      expect(guideRestore.status).toBe(200);
      expect(guideRestore.body.archivedAt).toBeNull();
    });

    it('soft delete requires archived and guide only; deleted project becomes 404 everywhere', async () => {
      // Non-archived project delete returns 409 INVALID_STATE
      let csrf = await getCsrfToken(faculty1Agent);
      const unarchivedDel = await faculty1Agent
        .delete(`/api/projects/${projectId}`)
        .set('X-CSRF-Token', csrf);
      expect(unarchivedDel.status).toBe(409);
      expect(unarchivedDel.body.error.code).toBe('INVALID_STATE');

      // Archive project first
      await pool.query(
        "UPDATE projects SET status = 'REJECTED', archived_at = now(), archived_by = $1 WHERE id = $2",
        [faculty1Id, projectId]
      );

      // Student delete returns 403
      csrf = await getCsrfToken(student1Agent);
      const studentDel = await student1Agent
        .delete(`/api/projects/${projectId}`)
        .set('X-CSRF-Token', csrf);
      expect(studentDel.status).toBe(403);

      // Guide soft-deletes project
      csrf = await getCsrfToken(faculty1Agent);
      const delRes = await faculty1Agent
        .delete(`/api/projects/${projectId}`)
        .set('X-CSRF-Token', csrf);
      expect(delRes.status).toBe(204);

      // Verify row still exists in DB with deleted_at and deleted_by set
      const dbRow = await pool.query(
        'SELECT deleted_at, deleted_by FROM projects WHERE id = $1',
        [projectId]
      );
      expect(dbRow.rows).toHaveLength(1);
      expect(dbRow.rows[0].deleted_at).toBeDefined();
      expect(dbRow.rows[0].deleted_by).toBe(faculty1Id);

      // Deleted project returns 404 on all routes
      const getDetail = await student1Agent.get(`/api/projects/${projectId}`);
      expect(getDetail.status).toBe(404);

      const getHistory = await faculty1Agent.get(`/api/projects/${projectId}/history`);
      expect(getHistory.status).toBe(404);

      const listRes = await faculty1Agent.get('/api/projects');
      expect(listRes.body.items).toHaveLength(0);

      // Cannot be restored
      csrf = await getCsrfToken(faculty1Agent);
      const restoreAttempt = await faculty1Agent
        .patch(`/api/projects/${projectId}/restore`)
        .set('X-CSRF-Token', csrf);
      expect(restoreAttempt.status).toBe(404);
    });

    it('list projects: filtering, searching, assigned=me, and pagination', async () => {
      // Create 2 additional projects
      let csrf = await getCsrfToken(student1Agent);
      await student1Agent
        .post('/api/projects')
        .set('X-CSRF-Token', csrf)
        .send({
          title: 'Special 100% Machine Learning',
          description: 'Testing search escaping %',
          guideId: faculty1Id,
        });

      csrf = await getCsrfToken(student1Agent);
      await student1Agent
        .post('/api/projects')
        .set('X-CSRF-Token', csrf)
        .send({
          title: 'Under_score Database System',
          description: 'Testing search escaping _',
          guideId: faculty2Id,
        });

      // Search with % escaped
      const searchPct = await student1Agent.get('/api/projects?search=100%');
      expect(searchPct.status).toBe(200);
      expect(searchPct.body.items).toHaveLength(1);
      expect(searchPct.body.items[0].title).toContain('100%');

      // Search with _ escaped
      const searchUnderscore = await student1Agent.get('/api/projects?search=Under_');
      expect(searchUnderscore.status).toBe(200);
      expect(searchUnderscore.body.items).toHaveLength(1);
      expect(searchUnderscore.body.items[0].title).toContain('Under_score');

      // Faculty assigned=me filter
      const assignedMe = await faculty1Agent.get('/api/projects?assigned=me');
      expect(assignedMe.status).toBe(200);
      expect(assignedMe.body.items).toHaveLength(2); // projectId and 100% project

      // Pagination
      const page1 = await student1Agent.get('/api/projects?page=1&pageSize=2');
      expect(page1.status).toBe(200);
      expect(page1.body.items).toHaveLength(2);
      expect(page1.body.total).toBe(3);

      const page2 = await student1Agent.get('/api/projects?page=2&pageSize=2');
      expect(page2.status).toBe(200);
      expect(page2.body.items).toHaveLength(1);
    });
  });
});
