#!/usr/bin/env ts-node
import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';

async function main() {
  const databaseUrl =
    process.env.DATABASE_URL ||
    'postgresql://projecthub:projecthub@localhost:5432/projecthub_dev';

  const pool = new Pool({ connectionString: databaseUrl });

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    const migrationsDir = path.join(__dirname, '..', 'db', 'migrations');
    const files = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    const { rows: applied } = await pool.query(
      'SELECT filename FROM schema_migrations'
    );
    const appliedSet = new Set(applied.map((r: { filename: string }) => r.filename));

    for (const file of files) {
      if (appliedSet.has(file)) {
        console.log(`[skip] ${file} (already applied)`);
        continue;
      }
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query(
          'INSERT INTO schema_migrations(filename) VALUES($1)',
          [file]
        );
        await client.query('COMMIT');
        console.log(`[apply] ${file}`);
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    }

    console.log('Migration complete.');
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
