import { chromium } from '@playwright/test';
import { spawn, ChildProcess } from 'child_process';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const rootDir = path.resolve(__dirname, '../..');
const outputDir = path.resolve(rootDir, 'artifacts/screens');
const dbUrl = process.env.E2E_DATABASE_URL || 'postgresql://projecthub:projecthub@localhost:5432/projecthub_e2e';
const e2ePassword = process.env.E2E_PASSWORD || 'demo-password-here';
const sessionSecret = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
const baseURL = process.env.E2E_BASE_URL || 'http://localhost:5175';

async function isServerReady(url: string): Promise<boolean> {
  try {
    const res = await fetch(url);
    return res.status < 500;
  } catch {
    return false;
  }
}

async function waitForServer(url: string, timeoutMs: number = 30000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await isServerReady(url)) return;
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Timed out waiting for server at ${url}`);
}

async function main() {
  console.log('[e2e:screens] Starting screenshot capture suite...');
  fs.mkdirSync(outputDir, { recursive: true });

  const spawnedProcesses: ChildProcess[] = [];

  // Start web servers if not already running and not using external E2E_BASE_URL
  if (!process.env.E2E_BASE_URL && !(await isServerReady(`${baseURL}/`))) {
    console.log('[e2e:screens] Starting backend and frontend dev servers...');

    const backendProc = spawn(
      'npm',
      ['run', 'dev', '--workspace=backend'],
      {
        cwd: rootDir,
        env: {
          ...process.env,
          DATABASE_URL: dbUrl,
          PORT: '5002',
          SESSION_SECRET: sessionSecret,
          ALLOWED_ORIGINS: 'http://localhost:5175,http://127.0.0.1:5175',
          NODE_ENV: 'development',
        },
        stdio: 'ignore',
        detached: true,
      }
    );
    spawnedProcesses.push(backendProc);

    const frontendProc = spawn(
      'npm',
      ['run', 'dev', '--workspace=frontend'],
      {
        cwd: rootDir,
        env: {
          ...process.env,
          VITE_DEV_PORT: '5175',
          VITE_API_PROXY_TARGET: 'http://127.0.0.1:5002',
        },
        stdio: 'ignore',
        detached: true,
      }
    );
    spawnedProcesses.push(frontendProc);

    console.log('[e2e:screens] Waiting for servers to be healthy...');
    await waitForServer('http://127.0.0.1:5002/api/health');
    await waitForServer('http://localhost:5175');
    console.log('[e2e:screens] Dev servers are ready.');
  }

  const browser = await chromium.launch({ headless: true });

  try {
    // ---------------- Desktop Captures (1280x800) ----------------
    const desktopContext = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      baseURL,
    });
    const page = await desktopContext.newPage();

    // 1. Login
    console.log('[e2e:screens] Capturing login...');
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: path.join(outputDir, 'login.png'), fullPage: true });

    // 2. Register
    console.log('[e2e:screens] Capturing register...');
    await page.goto('/register');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: path.join(outputDir, 'register.png'), fullPage: true });

    // 3. Student Overview (patel@demo.projecthub.test)
    console.log('[e2e:screens] Logging in as student (patel)...');
    await page.goto('/login');
    await page.getByLabel(/email address/i).fill('patel@demo.projecthub.test');
    await page.getByLabel(/password/i).fill(e2ePassword);
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL(/\/overview/);
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: path.join(outputDir, 'student-overview.png'), fullPage: true });

    // 4. My Projects
    console.log('[e2e:screens] Capturing my-projects...');
    await page.goto('/projects');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: path.join(outputDir, 'my-projects.png'), fullPage: true });

    // 5. Create Project
    console.log('[e2e:screens] Capturing create-project...');
    await page.goto('/projects/new');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: path.join(outputDir, 'create-project.png'), fullPage: true });

    // 6. Student Project Details (a DRAFT project)
    console.log('[e2e:screens] Capturing student-project-details (DRAFT)...');
    await page.goto('/projects');
    await page.waitForLoadState('networkidle');
    const draftLink = page.getByRole('link', { name: /autonomous drone navigation system/i }).first();
    await draftLink.click();
    await page.waitForURL(/\/projects\/[0-9a-f-]+/);
    await page.waitForSelector('text=PROJECT SCOPE');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: path.join(outputDir, 'student-project-details.png'), fullPage: true });

    // 7. Profile
    console.log('[e2e:screens] Capturing profile...');
    await page.goto('/profile');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: path.join(outputDir, 'profile.png'), fullPage: true });

    // Logout student
    await page.getByRole('button', { name: /sign out|logout/i }).click();
    await page.waitForURL(/\/login/);
    await desktopContext.close();

    // ---------------- Faculty Captures ----------------
    const facultyContext = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      baseURL,
    });
    const facultyPage = await facultyContext.newPage();

    // Login faculty (sharma@demo.projecthub.test)
    console.log('[e2e:screens] Logging in as faculty (sharma)...');
    await facultyPage.goto('/login');
    await facultyPage.getByLabel(/email address/i).fill('sharma@demo.projecthub.test');
    await facultyPage.getByLabel(/password/i).fill(e2ePassword);
    await facultyPage.getByRole('button', { name: /sign in/i }).click();
    await facultyPage.waitForURL(/\/overview/);
    await facultyPage.waitForLoadState('networkidle');

    // 8. Faculty Overview
    console.log('[e2e:screens] Capturing faculty-overview...');
    await facultyPage.screenshot({ path: path.join(outputDir, 'faculty-overview.png'), fullPage: true });

    // 9. All Projects
    console.log('[e2e:screens] Capturing all-projects...');
    await facultyPage.goto('/projects');
    await facultyPage.waitForLoadState('networkidle');
    await facultyPage.screenshot({ path: path.join(outputDir, 'all-projects.png'), fullPage: true });

    // 10. Pending Reviews
    console.log('[e2e:screens] Capturing pending-reviews...');
    await facultyPage.goto('/pending-reviews');
    await facultyPage.waitForLoadState('networkidle');
    await facultyPage.screenshot({ path: path.join(outputDir, 'pending-reviews.png'), fullPage: true });

    // 11. Faculty Project Details (pending review)
    console.log('[e2e:screens] Capturing faculty-project-details (PENDING_REVIEW)...');
    await facultyPage.goto('/projects?status=PENDING_REVIEW');
    await facultyPage.waitForLoadState('networkidle');
    const pendingLink = facultyPage.getByRole('link', { name: /smart campus energy monitoring/i }).first();
    await pendingLink.click();
    await facultyPage.waitForURL(/\/projects\/[0-9a-f-]+/);
    await facultyPage.waitForSelector('text=PROJECT SCOPE');
    await facultyPage.waitForLoadState('networkidle');
    await facultyPage.screenshot({ path: path.join(outputDir, 'faculty-project-details.png'), fullPage: true });

    await facultyPage.getByRole('button', { name: /sign out|logout/i }).click();
    await facultyPage.waitForURL(/\/login/);
    await facultyContext.close();

    // ---------------- Mobile 390px Captures (390x844) ----------------
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      baseURL,
    });
    const mobilePage = await mobileContext.newPage();

    // 12. Login at 390px
    console.log('[e2e:screens] Capturing login-390px...');
    await mobilePage.goto('/login');
    await mobilePage.waitForLoadState('networkidle');
    await mobilePage.screenshot({ path: path.join(outputDir, 'login-390px.png'), fullPage: true });

    // 13. Student Overview at 390px
    console.log('[e2e:screens] Capturing student-overview-390px...');
    await mobilePage.getByLabel(/email address/i).fill('patel@demo.projecthub.test');
    await mobilePage.getByLabel(/password/i).fill(e2ePassword);
    await mobilePage.getByRole('button', { name: /sign in/i }).click();
    await mobilePage.waitForURL(/\/overview/);
    await mobilePage.waitForSelector('text=ACTIVE PROJECT');
    await mobilePage.waitForLoadState('networkidle');
    await mobilePage.screenshot({ path: path.join(outputDir, 'student-overview-390px.png'), fullPage: true });

    // 14. Drawer Open at 390px
    console.log('[e2e:screens] Capturing drawer-open-390px...');
    const menuButton = mobilePage.getByRole('button', { name: /open menu/i });
    await menuButton.click();
    await mobilePage.waitForTimeout(300); // Wait for drawer transition
    await mobilePage.screenshot({ path: path.join(outputDir, 'drawer-open-390px.png'), fullPage: false });

    await mobileContext.close();

    console.log('[e2e:screens] All screenshots captured successfully!');
  } finally {
    await browser.close();

    // Kill any dev servers we spawned
    for (const proc of spawnedProcesses) {
      if (proc.pid) {
        try {
          process.kill(-proc.pid);
        } catch {
          proc.kill();
        }
      }
    }
  }

  // Print captured screenshot files and sizes
  console.log('\n--- CAPTURED SCREENSHOTS ---');
  const files = fs.readdirSync(outputDir).filter((f) => f.endsWith('.png'));
  for (const f of files.sort()) {
    const filePath = path.join(outputDir, f);
    const stats = fs.statSync(filePath);
    console.log(`${filePath} (${(stats.size / 1024).toFixed(1)} kB)`);
  }
}

main().catch((err) => {
  console.error('[e2e:screens] Error:', err);
  process.exit(1);
});
