import { test, expect } from '@playwright/test';
import { login, logout, getE2EPassword, uniqueSuffix } from '../helpers/auth';

test.describe('Auth and Security', () => {
  test('unauthenticated visit to /projects redirects to /login', async ({ page }) => {
    await page.goto('/projects');
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole('heading', { name: /sign in to projecthub/i })).toBeVisible();
  });

  test('wrong password shows an error and stays signed out', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email address/i).fill('patel@demo.projecthub.test');
    await page.getByLabel(/password/i).fill('wrongpassword123');
    await page.getByRole('button', { name: /sign in/i }).click();

    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page.getByRole('alert')).toContainText(/invalid email or password/i);
    await expect(page).toHaveURL(/\/login/);
  });

  test('register a new [E2E] student, log out, and log in again', async ({ page }) => {
    const suffix = uniqueSuffix();
    const studentName = `[E2E] Student ${suffix}`;
    const studentEmail = `student_${suffix}@example.com`;
    const regNumber = `RA${Date.now().toString().slice(-8)}`;
    const password = getE2EPassword();

    await page.goto('/register');
    await page.getByLabel(/full name/i).fill(studentName);
    await page.getByLabel(/registration number/i).fill(regNumber);
    await page.getByLabel(/email address/i).fill(studentEmail);
    await page.getByLabel(/password/i).fill(password);
    await page.getByRole('button', { name: /create account/i }).click();

    // Successfully registered -> redirected to student overview
    await expect(page).toHaveURL(/\/overview/);
    await expect(page.getByText(studentName)).toBeVisible();

    // Log out
    await logout(page);

    // Log back in with the newly created credentials
    await login(page, studentEmail, password);
    await expect(page).toHaveURL(/\/overview/);
    await expect(page.getByText(studentName)).toBeVisible();
  });

  test('faculty user visiting /projects/new lands on Unauthorized page', async ({ page }) => {
    await login(page, 'sharma@demo.projecthub.test');
    await page.goto('/projects/new');

    await expect(page.getByRole('heading', { name: /access restricted/i })).toBeVisible();
    await expect(page.getByText(/do not have the required permissions/i)).toBeVisible();
  });

  test('an unknown project id shows the Not found state', async ({ page }) => {
    await login(page, 'sharma@demo.projecthub.test');
    await page.goto('/projects/00000000-0000-0000-0000-000000000000');

    await expect(page.getByText(/project not found/i)).toBeVisible();
    await expect(page.getByText(/does not exist or has been deleted/i)).toBeVisible();
  });

  test('API security headers, session cookies, and authentication enforcement', async ({
    request,
    page,
    context,
  }) => {
    // 1. Unauthenticated GET /api/projects returns 401
    const unauthRes = await request.get('/api/projects');
    expect(unauthRes.status()).toBe(401);

    // 2. Response has no X-Powered-By header
    expect(unauthRes.headers()['x-powered-by']).toBeUndefined();

    // 3. Log in through browser page to inspect session cookie
    await login(page, 'patel@demo.projecthub.test');

    const cookies = await context.cookies();
    const sessionCookie = cookies.find((c) => c.name === 'projecthub.sid');
    expect(sessionCookie).toBeDefined();
    expect(sessionCookie?.httpOnly).toBe(true);
    expect(sessionCookie?.sameSite.toLowerCase()).toBe('lax');

    // 4. POST without X-CSRF-Token returns 403
    const postRes = await request.post('/api/projects', {
      data: {
        title: 'Unauthorized Project',
        description: 'Test description',
        guideId: '00000000-0000-0000-0000-000000000000',
      },
    });
    expect(postRes.status()).toBe(403);
    const postJson = await postRes.json();
    expect(postJson.error?.code).toBe('CSRF_INVALID');
  });

  test('login rate limit: 6 wrong logins with throwaway email shows rate-limit UI message', async ({
    page,
  }) => {
    const throwawayEmail = `ratelimit_${uniqueSuffix()}@example.com`;
    await page.goto('/login');

    for (let i = 1; i <= 6; i++) {
      await page.getByLabel(/email address/i).fill(throwawayEmail);
      await page.getByLabel(/password/i).fill('wrongpass');
      await page.getByRole('button', { name: /sign in/i }).click();

      if (i < 6) {
        await expect(page.getByRole('alert')).toBeVisible();
        await expect(page.getByRole('alert')).toContainText(/invalid email or password/i);
      }
    }

    // 6th attempt hits rate limit
    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page.getByRole('alert')).toContainText(/too many login attempts/i);
  });
});
