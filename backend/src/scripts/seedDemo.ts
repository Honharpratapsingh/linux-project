import { Pool } from 'pg';
import bcrypt from 'bcrypt';
import { env } from '../config/env';

async function seedDemo(): Promise<void> {
  const password = process.env.DEMO_SEED_PASSWORD;
  if (!password) {
    console.error(
      '[seed:demo] Error: DEMO_SEED_PASSWORD environment variable is required.'
    );
    process.exit(1);
  }

  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_DEMO_SEED !== 'true') {
    console.error(
      '[seed:demo] Error: Demo seeding is forbidden in production unless ALLOW_DEMO_SEED=true.'
    );
    process.exit(1);
  }

  const pool = new Pool({ connectionString: env.DATABASE_URL });

  try {
    // 1. Check idempotency
    const checkRes = await pool.query<{ count: string }>(
      "SELECT count(*)::text as count FROM users WHERE email LIKE '%@demo.projecthub.test'"
    );
    const existingCount = parseInt(checkRes.rows[0]?.count || '0', 10);
    if (existingCount > 0) {
      console.log(
        `[seed:demo] Demo users already exist (${existingCount} found). Skipping demo seed (idempotent).`
      );
      return;
    }

    const rounds = env.BCRYPT_ROUNDS || 12;
    const passwordHash = await bcrypt.hash(password, rounds);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 2. Create 3 Faculty
      const facultyData = [
        {
          name: 'Dr. Rajesh Sharma (Demo)',
          email: 'sharma@demo.projecthub.test',
        },
        {
          name: 'Prof. Vikram Singh (Demo)',
          email: 'singh@demo.projecthub.test',
        },
        {
          name: 'Dr. Ananya Iyer (Demo)',
          email: 'iyer@demo.projecthub.test',
        },
      ];

      const facultyIds: Record<string, string> = {};
      for (const f of facultyData) {
        const res = await client.query<{ id: string }>(
          `INSERT INTO users (full_name, email, password_hash, role)
           VALUES ($1, $2, $3, 'FACULTY')
           RETURNING id`,
          [f.name, f.email, passwordHash]
        );
        facultyIds[f.email] = res.rows[0].id;
      }

      // 3. Create 6 Students
      const studentData = [
        {
          name: 'Aarav Patel (Demo)',
          email: 'patel@demo.projecthub.test',
          reg: 'RA211100301001',
        },
        {
          name: 'Diya Rao (Demo)',
          email: 'rao@demo.projecthub.test',
          reg: 'RA211100301002',
        },
        {
          name: 'Kavya Nair (Demo)',
          email: 'nair@demo.projecthub.test',
          reg: 'RA211100301003',
        },
        {
          name: 'Rohan Gupta (Demo)',
          email: 'gupta@demo.projecthub.test',
          reg: 'RA211100301004',
        },
        {
          name: 'Sanya Reddy (Demo)',
          email: 'reddy@demo.projecthub.test',
          reg: 'RA211100301005',
        },
        {
          name: 'Aditya Joshi (Demo)',
          email: 'joshi@demo.projecthub.test',
          reg: 'RA211100301006',
        },
      ];

      const studentIds: Record<string, string> = {};
      for (const s of studentData) {
        const res = await client.query<{ id: string }>(
          `INSERT INTO users (full_name, email, password_hash, role, registration_number)
           VALUES ($1, $2, $3, 'STUDENT', $4)
           RETURNING id`,
          [s.name, s.email, passwordHash, s.reg]
        );
        studentIds[s.email] = res.rows[0].id;
      }

      const sSharma = facultyIds['sharma@demo.projecthub.test'];
      const sSingh = facultyIds['singh@demo.projecthub.test'];
      const sIyer = facultyIds['iyer@demo.projecthub.test'];

      const sPatel = studentIds['patel@demo.projecthub.test'];
      const sRao = studentIds['rao@demo.projecthub.test'];
      const sNair = studentIds['nair@demo.projecthub.test'];
      const sGupta = studentIds['gupta@demo.projecthub.test'];
      const sReddy = studentIds['reddy@demo.projecthub.test'];
      const sJoshi = studentIds['joshi@demo.projecthub.test'];

      // Project 1: DRAFT
      const p1 = await client.query<{ id: string }>(
        `INSERT INTO projects (title, description, created_by, guide_id, status)
         VALUES ('[DEMO] Autonomous Drone Navigation System', 'Quadrotor trajectory planning and obstacle avoidance in ROS', $1, $2, 'DRAFT')
         RETURNING id`,
        [sPatel, sSharma]
      );
      await client.query(
        "INSERT INTO project_members (project_id, student_id, membership_role) VALUES ($1, $2, 'LEAD'), ($1, $3, 'MEMBER')",
        [p1.rows[0].id, sPatel, sRao]
      );
      await client.query(
        "INSERT INTO project_status_history (project_id, previous_status, new_status, changed_by, reason) VALUES ($1, null, 'DRAFT', $2, 'Project created')",
        [p1.rows[0].id, sPatel]
      );
      await client.query(
        "INSERT INTO milestones (project_id, title, due_date, is_completed, completed_at) VALUES ($1, 'Literature Survey', '2026-03-01', true, now())",
        [p1.rows[0].id]
      );
      await client.query(
        "INSERT INTO milestones (project_id, title, due_date, is_completed) VALUES ($1, 'Gazebo Simulation Setup', '2026-04-15', false)",
        [p1.rows[0].id]
      );

      // Project 2: PENDING_REVIEW
      const p2 = await client.query<{ id: string }>(
        `INSERT INTO projects (title, description, created_by, guide_id, status, submission_date)
         VALUES ('[DEMO] Smart Campus Energy Monitoring', 'IoT sensor network for power meter reading and analytics', $1, $2, 'PENDING_REVIEW', now() - interval '3 days')
         RETURNING id`,
        [sRao, sSingh]
      );
      await client.query(
        "INSERT INTO project_members (project_id, student_id, membership_role) VALUES ($1, $2, 'LEAD')",
        [p2.rows[0].id, sRao]
      );
      await client.query(
        `INSERT INTO project_status_history (project_id, previous_status, new_status, changed_by, reason)
         VALUES ($1, null, 'DRAFT', $2, null), ($1, 'DRAFT', 'PENDING_REVIEW', $2, 'Ready for review')`,
        [p2.rows[0].id, sRao]
      );
      await client.query(
        "INSERT INTO milestones (project_id, title, due_date, is_completed) VALUES ($1, 'Hardware Selection', '2026-03-10', false), ($1, 'Firmware Design', '2026-04-20', false)",
        [p2.rows[0].id]
      );

      // Project 3: CHANGES_REQUESTED
      const p3 = await client.query<{ id: string }>(
        `INSERT INTO projects (title, description, created_by, guide_id, status, submission_date)
         VALUES ('[DEMO] Healthcare Telemedicine Portal', 'Secure HIPAA compliant consultation and prescription platform', $1, $2, 'CHANGES_REQUESTED', now() - interval '5 days')
         RETURNING id`,
        [sNair, sIyer]
      );
      await client.query(
        "INSERT INTO project_members (project_id, student_id, membership_role) VALUES ($1, $2, 'LEAD'), ($1, $3, 'MEMBER')",
        [p3.rows[0].id, sNair, sGupta]
      );
      await client.query(
        `INSERT INTO project_status_history (project_id, previous_status, new_status, changed_by, reason)
         VALUES ($1, null, 'DRAFT', $2, null), ($1, 'DRAFT', 'PENDING_REVIEW', $2, null), ($1, 'PENDING_REVIEW', 'CHANGES_REQUESTED', $3, 'Please detail encryption standards')`,
        [p3.rows[0].id, sNair, sIyer]
      );
      await client.query(
        "INSERT INTO project_feedback (project_id, faculty_id, message, feedback_type) VALUES ($1, $2, 'Please detail data encryption standards for EHR storage.', 'CHANGES_REQUESTED')",
        [p3.rows[0].id, sIyer]
      );

      // Project 4: REJECTED
      const p4 = await client.query<{ id: string }>(
        `INSERT INTO projects (title, description, created_by, guide_id, status, submission_date)
         VALUES ('[DEMO] Blockchain Voting Protocol', 'Decentralized anonymous voting with zero knowledge proofs', $1, $2, 'REJECTED', now() - interval '7 days')
         RETURNING id`,
        [sGupta, sSharma]
      );
      await client.query(
        "INSERT INTO project_members (project_id, student_id, membership_role) VALUES ($1, $2, 'LEAD')",
        [p4.rows[0].id, sGupta]
      );
      await client.query(
        `INSERT INTO project_status_history (project_id, previous_status, new_status, changed_by, reason)
         VALUES ($1, null, 'DRAFT', $2, null), ($1, 'DRAFT', 'PENDING_REVIEW', $2, null), ($1, 'PENDING_REVIEW', 'REJECTED', $3, 'Scope out of bounds')`,
        [p4.rows[0].id, sGupta, sSharma]
      );
      await client.query(
        "INSERT INTO project_feedback (project_id, faculty_id, message, feedback_type) VALUES ($1, $2, 'Cryptographic scope exceeds capstone timelines.', 'REJECTION')",
        [p4.rows[0].id, sSharma]
      );

      // Project 5: IN_PROGRESS (incomplete milestones)
      const p5 = await client.query<{ id: string }>(
        `INSERT INTO projects (title, description, created_by, guide_id, status, submission_date)
         VALUES ('[DEMO] Quantum Key Distribution Simulator', 'Numerical simulation of BB84 protocol under channel noise', $1, $2, 'IN_PROGRESS', now() - interval '14 days')
         RETURNING id`,
        [sReddy, sSingh]
      );
      await client.query(
        "INSERT INTO project_members (project_id, student_id, membership_role) VALUES ($1, $2, 'LEAD'), ($1, $3, 'MEMBER')",
        [p5.rows[0].id, sReddy, sJoshi]
      );
      await client.query(
        `INSERT INTO project_status_history (project_id, previous_status, new_status, changed_by, reason)
         VALUES ($1, null, 'DRAFT', $2, null), ($1, 'DRAFT', 'PENDING_REVIEW', $2, null), ($1, 'PENDING_REVIEW', 'IN_PROGRESS', $3, 'Approved')`,
        [p5.rows[0].id, sReddy, sSingh]
      );
      await client.query(
        "INSERT INTO project_feedback (project_id, faculty_id, message, feedback_type) VALUES ($1, $2, 'Approved. Proceed with quantum channel model.', 'APPROVAL')",
        [p5.rows[0].id, sSingh]
      );
      await client.query(
        "INSERT INTO milestones (project_id, title, due_date, is_completed, completed_at) VALUES ($1, 'BB84 Algorithm Implementation', '2026-03-15', true, now() - interval '2 days')",
        [p5.rows[0].id]
      );
      await client.query(
        "INSERT INTO milestones (project_id, title, due_date, is_completed) VALUES ($1, 'Photon Polarization Noise Modelling', '2026-04-30', false)",
        [p5.rows[0].id]
      );

      // Project 6: IN_PROGRESS (all milestones completed -> readyToComplete!)
      const p6 = await client.query<{ id: string }>(
        `INSERT INTO projects (title, description, created_by, guide_id, status, submission_date)
         VALUES ('[DEMO] Satellite Imagery Crop Yield Prediction', 'Convolutional neural networks for multi-spectral remote sensing', $1, $2, 'IN_PROGRESS', now() - interval '20 days')
         RETURNING id`,
        [sJoshi, sSharma]
      );
      await client.query(
        "INSERT INTO project_members (project_id, student_id, membership_role) VALUES ($1, $2, 'LEAD'), ($1, $3, 'MEMBER')",
        [p6.rows[0].id, sJoshi, sPatel]
      );
      await client.query(
        `INSERT INTO project_status_history (project_id, previous_status, new_status, changed_by, reason)
         VALUES ($1, null, 'DRAFT', $2, null), ($1, 'DRAFT', 'PENDING_REVIEW', $2, null), ($1, 'PENDING_REVIEW', 'IN_PROGRESS', $3, 'Approved')`,
        [p6.rows[0].id, sJoshi, sSharma]
      );
      await client.query(
        "INSERT INTO project_feedback (project_id, faculty_id, message, feedback_type) VALUES ($1, $2, 'Approved for implementation.', 'APPROVAL')",
        [p6.rows[0].id, sSharma]
      );
      await client.query(
        "INSERT INTO milestones (project_id, title, due_date, is_completed, completed_at) VALUES ($1, 'Dataset Ingestion & NDVI Normalization', '2026-02-28', true, now() - interval '5 days'), ($1, 'CNN Model Training & Evaluation', '2026-03-30', true, now() - interval '1 day')",
        [p6.rows[0].id]
      );

      // Project 7: COMPLETED
      const p7 = await client.query<{ id: string }>(
        `INSERT INTO projects (title, description, created_by, guide_id, status, submission_date, completed_at)
         VALUES ('[DEMO] High-Throughput Distributed Cache', 'Consistent hashing in-memory key-value store with Raft consensus', $1, $2, 'COMPLETED', now() - interval '30 days', now() - interval '2 days')
         RETURNING id`,
        [sPatel, sIyer]
      );
      await client.query(
        "INSERT INTO project_members (project_id, student_id, membership_role) VALUES ($1, $2, 'LEAD'), ($1, $3, 'MEMBER')",
        [p7.rows[0].id, sPatel, sNair]
      );
      await client.query(
        `INSERT INTO project_status_history (project_id, previous_status, new_status, changed_by, reason)
         VALUES ($1, null, 'DRAFT', $2, null), ($1, 'DRAFT', 'PENDING_REVIEW', $2, null), ($1, 'PENDING_REVIEW', 'IN_PROGRESS', $3, 'Approved'), ($1, 'IN_PROGRESS', 'COMPLETED', $3, 'Completed successfully')`,
        [p7.rows[0].id, sPatel, sIyer]
      );
      await client.query(
        "INSERT INTO project_feedback (project_id, faculty_id, message, feedback_type) VALUES ($1, $2, 'Approved.', 'APPROVAL'), ($1, $2, 'Final defense verified and signed off.', 'COMMENT')",
        [p7.rows[0].id, sIyer]
      );
      await client.query(
        "INSERT INTO milestones (project_id, title, due_date, is_completed, completed_at) VALUES ($1, 'Raft Engine', '2026-02-10', true, now() - interval '15 days'), ($1, 'Performance Benchmarking', '2026-03-01', true, now() - interval '3 days')",
        [p7.rows[0].id]
      );

      // Project 8: COMPLETED + ARCHIVED
      const p8 = await client.query<{ id: string }>(
        `INSERT INTO projects (title, description, created_by, guide_id, status, submission_date, completed_at, archived_at, archived_by)
         VALUES ('[DEMO] Legacy Embedded Sensor Framework', 'Low power RTOS driver ecosystem for environmental sensors', $1, $2, 'COMPLETED', now() - interval '60 days', now() - interval '40 days', now() - interval '10 days', $2)
         RETURNING id`,
        [sRao, sSharma]
      );
      await client.query(
        "INSERT INTO project_members (project_id, student_id, membership_role) VALUES ($1, $2, 'LEAD'), ($1, $3, 'MEMBER')",
        [p8.rows[0].id, sRao, sGupta]
      );
      await client.query(
        `INSERT INTO project_status_history (project_id, previous_status, new_status, changed_by, reason)
         VALUES ($1, null, 'DRAFT', $2, null), ($1, 'DRAFT', 'PENDING_REVIEW', $2, null), ($1, 'PENDING_REVIEW', 'IN_PROGRESS', $3, null), ($1, 'IN_PROGRESS', 'COMPLETED', $3, null)`,
        [p8.rows[0].id, sRao, sSharma]
      );
      await client.query(
        "INSERT INTO milestones (project_id, title, is_completed, completed_at) VALUES ($1, 'Driver Suite', true, now() - interval '45 days')",
        [p8.rows[0].id]
      );

      // Project 9: DRAFT (Full team of 3 members!)
      const p9 = await client.query<{ id: string }>(
        `INSERT INTO projects (title, description, created_by, guide_id, status)
         VALUES ('[DEMO] Microservices Service Mesh Observability', 'eBPF-based distributed tracing and latency metrics pipeline', $1, $2, 'DRAFT')
         RETURNING id`,
        [sNair, sSingh]
      );
      await client.query(
        "INSERT INTO project_members (project_id, student_id, membership_role) VALUES ($1, $2, 'LEAD'), ($1, $3, 'MEMBER'), ($1, $4, 'MEMBER')",
        [p9.rows[0].id, sNair, sReddy, sJoshi]
      );
      await client.query(
        "INSERT INTO project_status_history (project_id, previous_status, new_status, changed_by, reason) VALUES ($1, null, 'DRAFT', $2, 'Team formed')",
        [p9.rows[0].id, sNair]
      );
      await client.query(
        "INSERT INTO milestones (project_id, title, due_date, is_completed) VALUES ($1, 'eBPF Kernel Probe Implementation', '2026-05-01', false)",
        [p9.rows[0].id]
      );

      await client.query('COMMIT');

      console.log('----------------------------------------------------');
      console.log('[seed:demo] Demo data seeded successfully!');
      console.log('----------------------------------------------------');
      console.log('FACULTY ACCOUNTS (Password: [DEMO_SEED_PASSWORD]):');
      console.log('  1. Dr. Rajesh Sharma (Demo)  : sharma@demo.projecthub.test');
      console.log('  2. Prof. Vikram Singh (Demo) : singh@demo.projecthub.test');
      console.log('  3. Dr. Ananya Iyer (Demo)    : iyer@demo.projecthub.test');
      console.log('');
      console.log('STUDENT ACCOUNTS (Password: [DEMO_SEED_PASSWORD]):');
      console.log('  1. Aarav Patel (Demo)        : patel@demo.projecthub.test');
      console.log('  2. Diya Rao (Demo)           : rao@demo.projecthub.test');
      console.log('  3. Kavya Nair (Demo)         : nair@demo.projecthub.test');
      console.log('  4. Rohan Gupta (Demo)        : gupta@demo.projecthub.test');
      console.log('  5. Sanya Reddy (Demo)        : reddy@demo.projecthub.test');
      console.log('  6. Aditya Joshi (Demo)       : joshi@demo.projecthub.test');
      console.log('----------------------------------------------------');
      console.log('9 Demo projects seeded across DRAFT, PENDING_REVIEW, CHANGES_REQUESTED,');
      console.log('REJECTED, IN_PROGRESS (incl. readyToComplete), COMPLETED, and ARCHIVED.');
      console.log('----------------------------------------------------');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } finally {
    await pool.end();
  }
}

seedDemo().catch((err) => {
  console.error('[seed:demo] Unexpected error:', err.message);
  process.exit(1);
});
