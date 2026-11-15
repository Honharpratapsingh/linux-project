export async function prepareE2EDatabase(): Promise<void> {
  const dbUrl = process.env.E2E_DATABASE_URL;
  if (!dbUrl) {
    throw new Error('E2E_DATABASE_URL environment variable is required.');
  }

  // Parse URL to check database name
  let dbName: string;
  try {
    const parsed = new URL(dbUrl);
    dbName = parsed.pathname.replace(/^\//, '');
  } catch (err: any) {
    throw new Error(`Invalid E2E_DATABASE_URL: ${err.message}`);
  }

  if (!dbName.endsWith('_e2e')) {
    throw new Error(
      `Safety check failed: database name "${dbName}" does not end with "_e2e". Refusing to run prepare on non-e2e database.`
    );
  }

  const e2ePassword = process.env.E2E_PASSWORD;
  if (!e2ePassword) {
    throw new Error('E2E_PASSWORD environment variable is required for E2E preparation.');
  }

  if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = dbUrl;
  }
  if (!process.env.SESSION_SECRET) {
    process.env.SESSION_SECRET = 'e2e-session-secret-placeholder-minimum-32-chars-long';
  }

  const { Pool } = await import('pg');
  const { runMigrations } = await import('../../backend/src/db/migrate');
  const { runSeedDemo } = await import('../../backend/src/scripts/seedDemo');

  const pool = new Pool({
    connectionString: dbUrl,
    max: 5,
  });

  try {
    console.log(`[e2e:prepare] Connecting to ${dbName}...`);

    // 1. Run migrations
    console.log('[e2e:prepare] Running migrations...');
    await runMigrations(pool);

    // 2. Truncate tables
    console.log('[e2e:prepare] Truncating application and session tables...');
    await pool.query(`
      TRUNCATE TABLE 
        session,
        project_feedback,
        project_history,
        milestones,
        project_members,
        projects,
        users
      CASCADE;
    `);

    // 3. Seed demo data using existing seedDemo logic
    console.log('[e2e:prepare] Seeding demo accounts and projects...');
    process.env.DEMO_SEED_PASSWORD = e2ePassword;
    const seedResult = await runSeedDemo(pool, e2ePassword);
    console.log(
      `[e2e:prepare] Seeding complete (${seedResult.projectCount} demo projects created).`
    );
    console.log('[e2e:prepare] Ready for E2E tests.');
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  prepareE2EDatabase().catch((err) => {
    console.error('[e2e:prepare] FAILED:', err.message);
    process.exit(1);
  });
}
