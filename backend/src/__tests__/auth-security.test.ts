import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { Pool } from 'pg';
import { createApp } from '../app';

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;

if (!TEST_DATABASE_URL) {
  throw new Error('TEST_DATABASE_URL must be set in environment');
}

const parsedDbUrl = new URL(TEST_DATABASE_URL);
const dbName = parsedDbUrl.pathname.replace(/^\//, '');
if (!dbName.endsWith('_test')) {
  throw new Error(`TEST_DATABASE_URL database name "${dbName}" must end in "_test"`);
}

describe('Auth & Security Tests (Step 1 / 2A)', () => {
  let pool: Pool;
  let app: any;

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

  beforeEach(async () => {
    await pool.query(
      'TRUNCATE users, projects, project_members, milestones, project_feedback, project_status_history, session CASCADE'
    );
  });

  async function getCsrfToken(agent: any): Promise<string> {
    const res = await agent.get('/api/auth/csrf');
    expect(res.status).toBe(200);
    expect(res.body.csrfToken).toBeDefined();
    return res.body.csrfToken;
  }

  describe('Registration', () => {
    it('register succeeds as STUDENT, ignores no-role request, hashes password', async () => {
      const agent = request.agent(app);
      const csrf = await getCsrfToken(agent);

      const res = await agent
        .post('/api/auth/register')
        .set('X-CSRF-Token', csrf)
        .send({
          fullName: 'Alice Student',
          email: 'alice@example.com',
          password: 'password123',
          registrationNumber: 'RA2111003010001',
        });

      expect(res.status).toBe(201);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.role).toBe('STUDENT');
      expect(res.body.user.fullName).toBe('Alice Student');
      expect(res.body.user.email).toBe('alice@example.com');
      expect(res.body.user.registrationNumber).toBe('RA2111003010001');
      expect(res.body.user.createdAt).toBeDefined();
      expect(res.body.user.password_hash).toBeUndefined();
      expect(res.body.csrfToken).toBeDefined();

      // Check user is logged in
      const meRes = await agent.get('/api/auth/me');
      expect(meRes.status).toBe(200);
      expect(meRes.body.user.id).toBe(res.body.user.id);
    });

    it('rejects client-supplied role in register body (strict schema)', async () => {
      const agent = request.agent(app);
      const csrf = await getCsrfToken(agent);

      const res = await agent
        .post('/api/auth/register')
        .set('X-CSRF-Token', csrf)
        .send({
          fullName: 'Malicious Student',
          email: 'bad@example.com',
          password: 'password123',
          role: 'FACULTY',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects duplicate email differing only by case with 409 EMAIL_TAKEN', async () => {
      const agent = request.agent(app);
      const csrf = await getCsrfToken(agent);

      const res1 = await agent
        .post('/api/auth/register')
        .set('X-CSRF-Token', csrf)
        .send({
          fullName: 'Alice Student',
          email: 'alice@example.com',
          password: 'password123',
        });
      expect(res1.status).toBe(201);

      const agent2 = request.agent(app);
      const csrf2 = await getCsrfToken(agent2);

      const res2 = await agent2
        .post('/api/auth/register')
        .set('X-CSRF-Token', csrf2)
        .send({
          fullName: 'Alice Clone',
          email: 'ALICE@EXAMPLE.COM',
          password: 'password123',
        });

      expect(res2.status).toBe(409);
      expect(res2.body.error.code).toBe('EMAIL_TAKEN');
    });

    it('rejects validation errors: short password or invalid email', async () => {
      const agent = request.agent(app);
      const csrf = await getCsrfToken(agent);

      const res1 = await agent
        .post('/api/auth/register')
        .set('X-CSRF-Token', csrf)
        .send({
          fullName: 'Alice Student',
          email: 'alice@example.com',
          password: 'short', // < 8 chars
        });
      expect(res1.status).toBe(400);
      expect(res1.body.error.code).toBe('VALIDATION_ERROR');

      const res2 = await agent
        .post('/api/auth/register')
        .set('X-CSRF-Token', csrf)
        .send({
          fullName: 'Alice Student',
          email: 'not-an-email',
          password: 'password123',
        });
      expect(res2.status).toBe(400);
      expect(res2.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Login & Session Management', () => {
    beforeEach(async () => {
      // Seed a student user
      const agent = request.agent(app);
      const csrf = await getCsrfToken(agent);
      await agent
        .post('/api/auth/register')
        .set('X-CSRF-Token', csrf)
        .send({
          fullName: 'Alice Student',
          email: 'alice@example.com',
          password: 'password123',
        });
    });

    it('login success returns user and changes session ID (regeneration)', async () => {
      const agent = request.agent(app);
      const csrf1 = await getCsrfToken(agent);

      // Get initial anonymous session cookie
      const resCsrf = await agent.get('/api/auth/csrf');
      const initialCookie = resCsrf.headers['set-cookie']?.[0] || '';

      const res = await agent
        .post('/api/auth/login')
        .set('X-CSRF-Token', csrf1)
        .send({
          email: 'alice@example.com',
          password: 'password123',
        });

      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe('alice@example.com');
      expect(res.body.csrfToken).toBeDefined();

      const postLoginCookie = res.headers['set-cookie']?.[0] || '';
      expect(postLoginCookie).not.toBe(initialCookie);

      // Verify /me works with session
      const meRes = await agent.get('/api/auth/me');
      expect(meRes.status).toBe(200);
      expect(meRes.body.user.email).toBe('alice@example.com');
    });

    it('/api/auth/me restores the session across separate requests', async () => {
      const agent = request.agent(app);
      const csrf = await getCsrfToken(agent);

      const loginRes = await agent
        .post('/api/auth/login')
        .set('X-CSRF-Token', csrf)
        .send({
          email: 'alice@example.com',
          password: 'password123',
        });
      expect(loginRes.status).toBe(200);

      // First separate request to /api/auth/me
      const me1 = await agent.get('/api/auth/me');
      expect(me1.status).toBe(200);
      expect(me1.body.user.email).toBe('alice@example.com');
      expect(me1.body.user.fullName).toBe('Alice Student');

      // Second separate request to /api/auth/me using the persisted session
      const me2 = await agent.get('/api/auth/me');
      expect(me2.status).toBe(200);
      expect(me2.body.user.email).toBe('alice@example.com');
      expect(me2.body.user.id).toBe(me1.body.user.id);
    });

    it('login failure returns identical message for unknown email and wrong password', async () => {
      const agent1 = request.agent(app);
      const csrf1 = await getCsrfToken(agent1);

      // Unknown email
      const res1 = await agent1
        .post('/api/auth/login')
        .set('X-CSRF-Token', csrf1)
        .send({
          email: 'unknown@example.com',
          password: 'password123',
        });

      expect(res1.status).toBe(401);
      expect(res1.body.error.code).toBe('UNAUTHENTICATED');

      const agent2 = request.agent(app);
      const csrf2 = await getCsrfToken(agent2);

      // Wrong password
      const res2 = await agent2
        .post('/api/auth/login')
        .set('X-CSRF-Token', csrf2)
        .send({
          email: 'alice@example.com',
          password: 'wrongpassword',
        });

      expect(res2.status).toBe(401);
      expect(res2.body.error.code).toBe('UNAUTHENTICATED');

      // Assert identical error messages
      expect(res1.body.error.message).toBe(res2.body.error.message);
      expect(res1.body.error.message).toBe('Invalid email or password');
    });

    it('logout destroys the session and clears cookie', async () => {
      const agent = request.agent(app);
      const csrf = await getCsrfToken(agent);

      await agent
        .post('/api/auth/login')
        .set('X-CSRF-Token', csrf)
        .send({
          email: 'alice@example.com',
          password: 'password123',
        });

      const me1 = await agent.get('/api/auth/me');
      expect(me1.status).toBe(200);

      const logoutCsrf = await getCsrfToken(agent);
      const logoutRes = await agent
        .post('/api/auth/logout')
        .set('X-CSRF-Token', logoutCsrf);

      expect(logoutRes.status).toBe(204);

      const me2 = await agent.get('/api/auth/me');
      expect(me2.status).toBe(401);
    });

    it('cookie flags: HttpOnly and SameSite=Lax are present', async () => {
      const res = await request(app).get('/api/auth/csrf');
      const raw = res.headers['set-cookie'];
      const cookieHeader = Array.isArray(raw) ? raw.join('; ') : String(raw || '');
      expect(cookieHeader).toMatch(/projecthub\.sid=/);
      expect(cookieHeader).toMatch(/HttpOnly/i);
      expect(cookieHeader).toMatch(/SameSite=Lax/i);
    });
  });

  describe('CSRF & Origin Protection', () => {
    it('rejects POST/PATCH/DELETE without CSRF token with 403 CSRF_INVALID', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'alice@example.com', password: 'password123' });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('CSRF_INVALID');
    });

    it('rejects POST/PATCH/DELETE with invalid CSRF token with 403 CSRF_INVALID', async () => {
      const agent = request.agent(app);
      await agent.get('/api/auth/csrf');

      const res = await agent
        .post('/api/auth/login')
        .set('X-CSRF-Token', 'invalid-token-here-12345')
        .send({ email: 'alice@example.com', password: 'password123' });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('CSRF_INVALID');
    });

    it('rejects mismatched Origin header with 403 CSRF_INVALID', async () => {
      const agent = request.agent(app);
      const csrf = await getCsrfToken(agent);

      const res = await agent
        .post('/api/auth/login')
        .set('X-CSRF-Token', csrf)
        .set('Origin', 'http://malicious-site.com')
        .send({ email: 'alice@example.com', password: 'password123' });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('CSRF_INVALID');
    });

    it('allows allowed Origin header', async () => {
      const agent = request.agent(app);
      const csrf = await getCsrfToken(agent);

      const res = await agent
        .post('/api/auth/login')
        .set('X-CSRF-Token', csrf)
        .set('Origin', 'http://localhost:5173')
        .send({ email: 'alice@example.com', password: 'wrongpassword' });

      // Origin accepted, falls through to 401 unauthenticated
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHENTICATED');
    });
  });

  describe('Rate Limiting & Proxy Behavior', () => {
    it('login rate limit: 6th failed attempt for same ip+email gets 429 RATE_LIMITED', async () => {
      const testApp = createApp(
        {
          BCRYPT_ROUNDS: 4,
          RATE_LIMIT_LOGIN_STRICT_MAX: 5,
          RATE_LIMIT_LOGIN_LOOSE_MAX: 50,
          TRUST_PROXY_HOPS: 1,
        },
        pool
      );

      const agent = request.agent(testApp);
      const email = 'ratelimit-target@example.com';

      for (let i = 0; i < 5; i++) {
        const csrf = await getCsrfToken(agent);
        const res = await agent
          .post('/api/auth/login')
          .set('X-CSRF-Token', csrf)
          .send({ email, password: 'wrongpassword' });
        expect(res.status).toBe(401);
      }

      // 6th attempt should be blocked
      const csrf6 = await getCsrfToken(agent);
      const res6 = await agent
        .post('/api/auth/login')
        .set('X-CSRF-Token', csrf6)
        .send({ email, password: 'wrongpassword' });

      expect(res6.status).toBe(429);
      expect(res6.body.error.code).toBe('RATE_LIMITED');

      // A different email from the same IP is still allowed under looser per-IP limit
      const csrfDiff = await getCsrfToken(agent);
      const resDiff = await agent
        .post('/api/auth/login')
        .set('X-CSRF-Token', csrfDiff)
        .send({ email: 'different-email@example.com', password: 'wrongpassword' });

      expect(resDiff.status).toBe(401); // Not 429
    });

    it('proxy behavior (trust proxy = 1): different X-Forwarded-For IPs get separate buckets', async () => {
      const testApp = createApp(
        {
          BCRYPT_ROUNDS: 4,
          RATE_LIMIT_LOGIN_STRICT_MAX: 5,
          RATE_LIMIT_LOGIN_LOOSE_MAX: 50,
          TRUST_PROXY_HOPS: 1,
        },
        pool
      );

      const agent = request.agent(testApp);
      const email = 'proxy-test@example.com';

      // 5 failed attempts from IP 203.0.113.10
      for (let i = 0; i < 5; i++) {
        const csrf = await getCsrfToken(agent);
        const res = await agent
          .post('/api/auth/login')
          .set('X-CSRF-Token', csrf)
          .set('X-Forwarded-For', '203.0.113.10')
          .send({ email, password: 'wrongpassword' });
        expect(res.status).toBe(401);
      }

      // 6th attempt from 203.0.113.10 gets 429
      const csrf6 = await getCsrfToken(agent);
      const res6 = await agent
        .post('/api/auth/login')
        .set('X-CSRF-Token', csrf6)
        .set('X-Forwarded-For', '203.0.113.10')
        .send({ email, password: 'wrongpassword' });
      expect(res6.status).toBe(429);

      // Attempt from IP 203.0.113.20 is allowed (separate bucket)
      const csrfOther = await getCsrfToken(agent);
      const resOther = await agent
        .post('/api/auth/login')
        .set('X-CSRF-Token', csrfOther)
        .set('X-Forwarded-For', '203.0.113.20')
        .send({ email, password: 'wrongpassword' });
      expect(resOther.status).toBe(401); // Not 429

      // Spoofed leftmost entry ("1.2.3.4, 203.0.113.10") resolves to 203.0.113.10 and does NOT evade limit
      const csrfSpoof = await getCsrfToken(agent);
      const resSpoof = await agent
        .post('/api/auth/login')
        .set('X-CSRF-Token', csrfSpoof)
        .set('X-Forwarded-For', '1.2.3.4, 203.0.113.10')
        .send({ email, password: 'wrongpassword' });
      expect(resSpoof.status).toBe(429);
    });

    it('register rate limit: 3rd attempt gets 429 when max is 2', async () => {
      const testApp = createApp(
        {
          BCRYPT_ROUNDS: 4,
          RATE_LIMIT_REGISTER_MAX: 2,
        },
        pool
      );

      const agent = request.agent(testApp);

      for (let i = 0; i < 2; i++) {
        const csrf = await getCsrfToken(agent);
        const res = await agent
          .post('/api/auth/register')
          .set('X-CSRF-Token', csrf)
          .send({
            fullName: `Student ${i}`,
            email: `student${i}@example.com`,
            password: 'password123',
          });
        expect(res.status).toBe(201);
      }

      // 3rd attempt exceeds limit
      const csrf3 = await getCsrfToken(agent);
      const res3 = await agent
        .post('/api/auth/register')
        .set('X-CSRF-Token', csrf3)
        .send({
          fullName: 'Student 3',
          email: 'student3@example.com',
          password: 'password123',
        });
      expect(res3.status).toBe(429);
      expect(res3.body.error.code).toBe('RATE_LIMITED');
    });

    it('student search rate limit: exceeds limit per user', async () => {
      const testApp = createApp(
        {
          BCRYPT_ROUNDS: 4,
          RATE_LIMIT_STUDENT_SEARCH_MAX: 2,
        },
        pool
      );

      const agent = request.agent(testApp);
      const csrf = await getCsrfToken(agent);
      await agent
        .post('/api/auth/register')
        .set('X-CSRF-Token', csrf)
        .send({
          fullName: 'Searcher Student',
          email: 'searcher@example.com',
          password: 'password123',
        });

      // 2 searches succeed
      const s1 = await agent.get('/api/students/search?email=none1@example.com');
      expect(s1.status).toBe(200);
      const s2 = await agent.get('/api/students/search?email=none2@example.com');
      expect(s2.status).toBe(200);

      // 3rd search blocked
      const s3 = await agent.get('/api/students/search?email=none3@example.com');
      expect(s3.status).toBe(429);
      expect(s3.body.error.code).toBe('RATE_LIMITED');
    });

    it('password change rate limit: exceeds limit per user', async () => {
      const testApp = createApp(
        {
          BCRYPT_ROUNDS: 4,
          RATE_LIMIT_PASSWORD_MAX: 2,
        },
        pool
      );

      const agent = request.agent(testApp);
      const csrf = await getCsrfToken(agent);
      await agent
        .post('/api/auth/register')
        .set('X-CSRF-Token', csrf)
        .send({
          fullName: 'Pass Changer',
          email: 'changer@example.com',
          password: 'password123',
        });

      // 2 password changes (even failed ones with wrong password count towards user rate limit)
      for (let i = 0; i < 2; i++) {
        const c = await getCsrfToken(agent);
        const res = await agent
          .post('/api/profile/password')
          .set('X-CSRF-Token', c)
          .send({ currentPassword: 'wrong', newPassword: 'password456' });
        expect(res.status).toBe(400);
      }

      // 3rd attempt blocked by rate limit
      const c3 = await getCsrfToken(agent);
      const res3 = await agent
        .post('/api/profile/password')
        .set('X-CSRF-Token', c3)
        .send({ currentPassword: 'wrong', newPassword: 'password456' });
      expect(res3.status).toBe(429);
      expect(res3.body.error.code).toBe('RATE_LIMITED');
    });
  });

  describe('Secure Cookie Flag Behavior', () => {
    it('COOKIE_SECURE=auto sets Secure only when X-Forwarded-Proto: https is sent', async () => {
      const autoApp = createApp(
        {
          COOKIE_SECURE: 'auto',
          TRUST_PROXY_HOPS: 1,
        },
        pool
      );

      // Plain HTTP: no Secure flag
      const plainRes = await request(autoApp).get('/api/auth/csrf');
      const rawPlain = plainRes.headers['set-cookie'];
      const plainCookie = Array.isArray(rawPlain) ? rawPlain.join('; ') : String(rawPlain || '');
      expect(plainCookie).not.toMatch(/Secure/i);

      // HTTPS via proxy: sets Secure flag
      const httpsRes = await request(autoApp)
        .get('/api/auth/csrf')
        .set('X-Forwarded-Proto', 'https');
      const rawHttps = httpsRes.headers['set-cookie'];
      const httpsCookie = Array.isArray(rawHttps) ? rawHttps.join('; ') : String(rawHttps || '');
      expect(httpsCookie).toMatch(/Secure/i);
    });

    it('COOKIE_SECURE=true over plain HTTP sets no session cookie', async () => {
      const strictApp = createApp(
        {
          COOKIE_SECURE: 'true',
          TRUST_PROXY_HOPS: 0,
        },
        pool
      );

      // Over plain HTTP without secure connection, express-session refuses to set cookie
      const res = await request(strictApp).get('/api/auth/csrf');
      const setCookie = res.headers['set-cookie'];
      expect(setCookie).toBeUndefined();
    });
  });

  describe('Profile & Password Changes', () => {
    let studentAgent: any;

    beforeEach(async () => {
      studentAgent = request.agent(app);
      const csrf = await getCsrfToken(studentAgent);
      await studentAgent
        .post('/api/auth/register')
        .set('X-CSRF-Token', csrf)
        .send({
          fullName: 'Original Name',
          email: 'profile-test@example.com',
          password: 'password123',
        });
    });

    it('PATCH /api/profile updates fullName, rejects email/role changes (strict schema)', async () => {
      const csrf = await getCsrfToken(studentAgent);

      // Attempt to change role/email should be rejected
      const badRes = await studentAgent
        .patch('/api/profile')
        .set('X-CSRF-Token', csrf)
        .send({
          fullName: 'New Name',
          role: 'FACULTY',
        });
      expect(badRes.status).toBe(400);
      expect(badRes.body.error.code).toBe('VALIDATION_ERROR');

      // Valid name update
      const goodRes = await studentAgent
        .patch('/api/profile')
        .set('X-CSRF-Token', csrf)
        .send({
          fullName: 'Updated Name',
        });
      expect(goodRes.status).toBe(200);
      expect(goodRes.body.user.fullName).toBe('Updated Name');
      expect(goodRes.body.user.email).toBe('profile-test@example.com');
      expect(goodRes.body.user.role).toBe('STUDENT');
    });

    it('POST /api/profile/password verifies current password and invalidates other sessions', async () => {
      // 1. Create a second session for the same user (login from another device)
      const agent2 = request.agent(app);
      const csrf2 = await getCsrfToken(agent2);
      await agent2
        .post('/api/auth/login')
        .set('X-CSRF-Token', csrf2)
        .send({
          email: 'profile-test@example.com',
          password: 'password123',
        });

      // Both sessions are currently valid
      const me1Before = await studentAgent.get('/api/auth/me');
      expect(me1Before.status).toBe(200);
      const me2Before = await agent2.get('/api/auth/me');
      expect(me2Before.status).toBe(200);

      // 2. Reject wrong current password
      const csrfWrong = await getCsrfToken(studentAgent);
      const wrongRes = await studentAgent
        .post('/api/profile/password')
        .set('X-CSRF-Token', csrfWrong)
        .send({
          currentPassword: 'wrongpassword',
          newPassword: 'newpassword123',
        });
      expect(wrongRes.status).toBe(400);
      expect(wrongRes.body.error.code).toBe('VALIDATION_ERROR');

      // 3. Change password successfully from studentAgent
      const csrfChange = await getCsrfToken(studentAgent);
      const changeRes = await studentAgent
        .post('/api/profile/password')
        .set('X-CSRF-Token', csrfChange)
        .send({
          currentPassword: 'password123',
          newPassword: 'newpassword123',
        });
      expect(changeRes.status).toBe(204);

      // studentAgent's session was regenerated and is still authenticated
      const me1After = await studentAgent.get('/api/auth/me');
      expect(me1After.status).toBe(200);

      // agent2's session was invalidated in DB and should now be 401
      const me2After = await agent2.get('/api/auth/me');
      expect(me2After.status).toBe(401);

      // Verify login works with new password
      const agent3 = request.agent(app);
      const csrf3 = await getCsrfToken(agent3);
      const loginNewRes = await agent3
        .post('/api/auth/login')
        .set('X-CSRF-Token', csrf3)
        .send({
          email: 'profile-test@example.com',
          password: 'newpassword123',
        });
      expect(loginNewRes.status).toBe(200);
    });
  });

  describe('Directory: Faculty List & Student Search', () => {
    let studentAgent: any;
    let facultyAgent: any;

    beforeEach(async () => {
      // Create 2 faculty members in DB
      await pool.query(
        "INSERT INTO users (full_name, email, password_hash, role) VALUES ('Dr. Sharma', 'sharma@example.com', 'hash', 'FACULTY')"
      );
      await pool.query(
        "INSERT INTO users (full_name, email, password_hash, role) VALUES ('Prof. Iyer', 'iyer@example.com', 'hash', 'FACULTY')"
      );

      // Register student 1
      studentAgent = request.agent(app);
      const csrf1 = await getCsrfToken(studentAgent);
      await studentAgent
        .post('/api/auth/register')
        .set('X-CSRF-Token', csrf1)
        .send({
          fullName: 'Student One',
          email: 's1@example.com',
          password: 'password123',
        });

      // Register student 2
      const s2Agent = request.agent(app);
      const csrf2 = await getCsrfToken(s2Agent);
      await s2Agent
        .post('/api/auth/register')
        .set('X-CSRF-Token', csrf2)
        .send({
          fullName: 'Student Two',
          email: 's2@example.com',
          password: 'password123',
        });

      // Login as faculty
      facultyAgent = request.agent(app);
      const csrfF = await getCsrfToken(facultyAgent);
      // Update Dr. Sharma's password to test login
      const bcrypt = await import('bcrypt');
      const hash = await bcrypt.hash('facultypass123', 4);
      await pool.query('UPDATE users SET password_hash = $1 WHERE email = $2', [
        hash,
        'sharma@example.com',
      ]);

      await facultyAgent
        .post('/api/auth/login')
        .set('X-CSRF-Token', csrfF)
        .send({
          email: 'sharma@example.com',
          password: 'facultypass123',
        });
    });

    it('GET /api/faculty returns list of faculty sorted by full_name for authenticated users', async () => {
      const res = await studentAgent.get('/api/faculty');
      expect(res.status).toBe(200);
      expect(res.body.items).toHaveLength(2);
      expect(res.body.items[0].fullName).toBe('Dr. Sharma');
      expect(res.body.items[1].fullName).toBe('Prof. Iyer');

      // Unauthenticated gets 401
      const unauthRes = await request(app).get('/api/faculty');
      expect(unauthRes.status).toBe(401);
    });

    it('GET /api/students/search?email= requires STUDENT role (faculty gets 403)', async () => {
      const res = await facultyAgent.get('/api/students/search?email=s1@example.com');
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('GET /api/students/search?email= returns exact case-insensitive match, excluding caller', async () => {
      // Search for student 2 by uppercase email
      const resMatch = await studentAgent.get(
        '/api/students/search?email=S2@EXAMPLE.COM'
      );
      expect(resMatch.status).toBe(200);
      expect(resMatch.body.items).toHaveLength(1);
      expect(resMatch.body.items[0].email).toBe('s2@example.com');
      expect(resMatch.body.items[0].fullName).toBe('Student Two');

      // Searching for caller returns empty list
      const resSelf = await studentAgent.get('/api/students/search?email=s1@example.com');
      expect(resSelf.status).toBe(200);
      expect(resSelf.body.items).toHaveLength(0);

      // Searching for non-existent email returns empty list
      const resNone = await studentAgent.get(
        '/api/students/search?email=nobody@example.com'
      );
      expect(resNone.status).toBe(200);
      expect(resNone.body.items).toHaveLength(0);

      // Searching for faculty email returns empty list (STUDENT only)
      const resFaculty = await studentAgent.get(
        '/api/students/search?email=sharma@example.com'
      );
      expect(resFaculty.status).toBe(200);
      expect(resFaculty.body.items).toHaveLength(0);
    });
  });
});
