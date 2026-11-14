import { Pool } from 'pg';
import bcrypt from 'bcrypt';
import { env } from '../config/env';

async function provisionFaculty(): Promise<void> {
  const name = process.env.FACULTY_NAME?.trim();
  const email = process.env.FACULTY_EMAIL?.trim().toLowerCase();
  const password = process.env.FACULTY_PASSWORD;

  if (!name || !email || !password) {
    console.error(
      '[provision:faculty] Error: Missing required environment variables. FACULTY_NAME, FACULTY_EMAIL, and FACULTY_PASSWORD must be provided.'
    );
    process.exit(1);
  }

  if (password.length < 8) {
    console.error(
      '[provision:faculty] Error: FACULTY_PASSWORD must be at least 8 characters long.'
    );
    process.exit(1);
  }

  const pool = new Pool({ connectionString: env.DATABASE_URL });

  try {
    const existing = await pool.query(
      'SELECT id FROM users WHERE lower(email) = lower($1)',
      [email]
    );

    if (existing.rows.length > 0) {
      console.error(
        `[provision:faculty] Error: A user with email "${email}" already exists.`
      );
      process.exit(1);
    }

    const rounds = env.BCRYPT_ROUNDS || 12;
    const passwordHash = await bcrypt.hash(password, rounds);

    const result = await pool.query(
      `INSERT INTO users (full_name, email, password_hash, role)
       VALUES ($1, $2, $3, 'FACULTY')
       RETURNING id, full_name, email, role, created_at`,
      [name, email, passwordHash]
    );

    const user = result.rows[0];
    console.log(
      `[provision:faculty] Successfully created FACULTY user: ${user.full_name} <${user.email}> (id: ${user.id})`
    );
  } finally {
    await pool.end();
  }
}

provisionFaculty().catch((err) => {
  console.error('[provision:faculty] Unexpected error:', err.message);
  process.exit(1);
});
