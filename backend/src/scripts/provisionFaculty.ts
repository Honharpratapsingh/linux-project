import { Pool } from 'pg';
import bcrypt from 'bcrypt';
import { env } from '../config/env';

export async function runProvisionFaculty(
  pool: Pool,
  params: { name?: string; email?: string; password?: string } = {}
): Promise<{ id: string; fullName: string; email: string; role: string }> {
  const name = (params.name || process.env.FACULTY_NAME || '').trim();
  const email = (params.email || process.env.FACULTY_EMAIL || '').trim().toLowerCase();
  const password = params.password || process.env.FACULTY_PASSWORD;

  if (!name || !email || !password) {
    throw new Error(
      'Missing required parameters: name, email, and password must be provided.'
    );
  }

  if (password.length < 8) {
    throw new Error('FACULTY_PASSWORD must be at least 8 characters long.');
  }

  const existing = await pool.query(
    'SELECT id FROM users WHERE lower(email) = lower($1)',
    [email]
  );

  if (existing.rows.length > 0) {
    throw new Error(`A user with email "${email}" already exists.`);
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
  return {
    id: user.id,
    fullName: user.full_name,
    email: user.email,
    role: user.role,
  };
}

if (require.main === module) {
  const pool = new Pool({ connectionString: env.DATABASE_URL });
  runProvisionFaculty(pool)
    .then(() => pool.end())
    .catch((err) => {
      console.error('[provision:faculty] Unexpected error:', err.message);
      pool.end().finally(() => process.exit(1));
    });
}
