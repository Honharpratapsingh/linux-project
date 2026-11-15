import { test, expect } from '@playwright/test';
import { login, logout, getE2EPassword, uniqueSuffix } from '../helpers/auth';

test.describe('Lists and Dashboards', () => {
  test('faculty All Projects: status filter, title search, guide search, sort, pagination survive reload', async ({
    page,
  }) => {
    await login(page, 'sharma@demo.projecthub.test');
    await page.goto('/projects');

    // 1. Status filter
    await page.getByLabel('Filter by Status').selectOption('COMPLETED');
    await expect(page).toHaveURL(/status=COMPLETED/);
    await expect(page.getByTestId('badge-COMPLETED').first()).toBeVisible();

    // 2. Title search
    const searchInput = page.getByLabel('Search title');
    await searchInput.fill('Autonomous');
    await expect(page).toHaveURL(/search=Autonomous/);

    // 3. Guide-name search "singh"
    await page.getByLabel('Filter by Status').selectOption(''); // All statuses
    await searchInput.fill('');
    const guideInput = page.getByLabel('Search guide name');
    await guideInput.fill('singh');
    await expect(page).toHaveURL(/guide=singh/);
    await expect(page.getByText(/Prof\. Vikram Singh/i).first()).toBeVisible();

    // 4. Sorting
    const sortSelect = page.getByLabel('Sort by');
    await sortSelect.selectOption('title:asc');
    await expect(page).toHaveURL(/sort=title/);
    await expect(page).toHaveURL(/order=asc/);

    // 5. Check survive reload
    await page.reload();
    await expect(page).toHaveURL(/guide=singh/);
    await expect(page).toHaveURL(/sort=title/);
    await expect(guideInput).toHaveValue('singh');

    await logout(page);
  });

  test('faculty Overview count for a status equals the total shown in All Projects filtered by that status', async ({
    page,
  }) => {
    await login(page, 'sharma@demo.projecthub.test');

    const pendingLabel = page.getByText('Pending Review', { exact: true });
    await expect(pendingLabel).toBeVisible();
    const overviewCountText = await pendingLabel.locator('..').locator('.font-serif').innerText();
    const overviewPendingCount = parseInt(overviewCountText.trim(), 10);

    // Navigate to All Projects with status=PENDING_REVIEW
    await page.goto('/projects?status=PENDING_REVIEW');
    await expect(page.getByLabel(/filter by status/i)).toHaveValue('PENDING_REVIEW');

    const listRes = await page.request.get('/api/projects?status=PENDING_REVIEW');
    const listData = await listRes.json();
    expect(listData.total).toBe(overviewPendingCount);

    await logout(page);
  });

  test('student Overview shows only student data and empty state for fresh student with no projects', async ({
    page,
  }) => {
    const suffix = uniqueSuffix();
    const studentName = `[E2E] Fresh ${suffix}`;
    const studentEmail = `fresh_${suffix}@example.com`;
    const regNumber = `RA${Date.now().toString().slice(-8)}`;
    const password = getE2EPassword();

    // Register a brand new student
    await page.goto('/register');
    await page.getByLabel(/full name/i).fill(studentName);
    await page.getByLabel(/registration number/i).fill(regNumber);
    await page.getByLabel(/email address/i).fill(studentEmail);
    await page.getByLabel(/password/i).fill(password);
    await page.getByRole('button', { name: /create account/i }).click();

    // Land on Student Overview
    await expect(page).toHaveURL(/\/overview/);

    // Verify empty state
    await expect(page.getByText(/no projects yet/i)).toBeVisible();
    await expect(page.getByText(/you have not created or joined any capstone projects/i)).toBeVisible();
    await expect(page.getByRole('main').getByRole('button', { name: /create project/i }).first()).toBeVisible();

    await logout(page);
  });
});
