import { Pool, PoolClient } from 'pg';
import { User, UserRef } from '../types';

export interface UserRow {
  id: string;
  full_name: string;
  email: string;
  password_hash: string;
  role: 'STUDENT' | 'FACULTY';
  registration_number: string | null;
  created_at: Date;
  updated_at: Date;
}

export function mapUserRow(row: UserRow): User {
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    role: row.role,
    registrationNumber: row.registration_number,
    createdAt:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : new Date(row.created_at).toISOString(),
  };
}

export class UserRepository {
  constructor(private pool: Pool) {}

  async findByEmail(email: string): Promise<UserRow | null> {
    const res = await this.pool.query<UserRow>(
      'SELECT id, full_name, email, password_hash, role, registration_number, created_at, updated_at FROM users WHERE lower(email) = lower($1)',
      [email.trim()]
    );
    return res.rows[0] || null;
  }

  async findById(id: string): Promise<UserRow | null> {
    const res = await this.pool.query<UserRow>(
      'SELECT id, full_name, email, password_hash, role, registration_number, created_at, updated_at FROM users WHERE id = $1',
      [id]
    );
    return res.rows[0] || null;
  }

  async createStudent(params: {
    fullName: string;
    email: string;
    passwordHash: string;
    registrationNumber?: string | null;
  }): Promise<User> {
    const res = await this.pool.query<UserRow>(
      `INSERT INTO users (full_name, email, password_hash, role, registration_number)
       VALUES ($1, $2, $3, 'STUDENT', $4)
       RETURNING id, full_name, email, password_hash, role, registration_number, created_at, updated_at`,
      [
        params.fullName.trim(),
        params.email.trim().toLowerCase(),
        params.passwordHash,
        params.registrationNumber?.trim() || null,
      ]
    );
    return mapUserRow(res.rows[0]);
  }

  async updateFullName(id: string, fullName: string): Promise<User | null> {
    const res = await this.pool.query<UserRow>(
      `UPDATE users
       SET full_name = $1
       WHERE id = $2
       RETURNING id, full_name, email, password_hash, role, registration_number, created_at, updated_at`,
      [fullName.trim(), id]
    );
    return res.rows[0] ? mapUserRow(res.rows[0]) : null;
  }

  async updatePasswordHash(id: string, passwordHash: string): Promise<void> {
    await this.pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [
      passwordHash,
      id,
    ]);
  }

  async deleteOtherSessions(userId: string, currentSid: string): Promise<void> {
    await this.pool.query(
      "DELETE FROM session WHERE sess->>'userId' = $1 AND sid <> $2",
      [userId, currentSid]
    );
  }

  async findFaculty(): Promise<(UserRef & { email: string })[]> {
    const res = await this.pool.query<{ id: string; full_name: string; email: string }>(
      "SELECT id, full_name, email FROM users WHERE role = 'FACULTY' ORDER BY full_name ASC"
    );
    return res.rows.map((r) => ({
      id: r.id,
      fullName: r.full_name,
      email: r.email,
    }));
  }

  async searchStudentByEmail(
    email: string,
    excludeUserId: string
  ): Promise<(UserRef & { email: string })[]> {
    const res = await this.pool.query<{ id: string; full_name: string; email: string }>(
      `SELECT id, full_name, email
       FROM users
       WHERE role = 'STUDENT'
         AND lower(email) = lower($1)
         AND id <> $2
       LIMIT 1`,
      [email.trim(), excludeUserId]
    );
    return res.rows.map((r) => ({
      id: r.id,
      fullName: r.full_name,
      email: r.email,
    }));
  }
}
