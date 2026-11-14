import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { Pool, PoolClient } from 'pg';

function sha256(content: string): string {
  return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}

export async function runMigrations(pool: Pool): Promise<void> {
  const client: PoolClient = await pool.connect();
  try {
    // Create tracking table
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name       TEXT        NOT NULL PRIMARY KEY,
        checksum   TEXT        NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    // Advisory lock — prevents concurrent migration runners
    await client.query(`SELECT pg_advisory_lock(hashtext('projecthub_migrations'))`);

    // Read migration files
    const migrationsDir = path.join(__dirname, '..', '..', 'migrations');
    const files = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    // Load already-applied migrations
    const { rows } = await client.query<{ name: string; checksum: string }>(
      'SELECT name, checksum FROM schema_migrations ORDER BY name'
    );
    const applied = new Map(rows.map((r) => [r.name, r.checksum]));

    for (const file of files) {
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      const checksum = sha256(sql);

      if (applied.has(file)) {
        const storedChecksum = applied.get(file)!;
        if (storedChecksum !== checksum) {
          throw new Error(
            `Migration file "${file}" has been modified after being applied. ` +
              `Stored checksum: ${storedChecksum}, current: ${checksum}`
          );
        }
        console.log(`[migrate] skip  ${file} (already applied)`);
        continue;
      }

      // Apply in its own transaction
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query(
          'INSERT INTO schema_migrations(name, checksum) VALUES($1, $2)',
          [file, checksum]
        );
        await client.query('COMMIT');
        console.log(`[migrate] apply ${file}`);
      } catch (err) {
        await client.query('ROLLBACK');
        throw new Error(`Migration "${file}" failed: ${(err as Error).message}`);
      }
    }

    console.log('[migrate] done');
  } finally {
    client.release();
  }
}

// CLI entry point
if (require.main === module) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { env } = require('../config/env');
  const { Pool } = require('pg');
  const pool = new Pool({ connectionString: env.DATABASE_URL });
  runMigrations(pool)
    .then(() => pool.end())
    .catch((err) => {
      console.error('[migrate] FAILED:', err.message);
      process.exit(1);
    });
}
