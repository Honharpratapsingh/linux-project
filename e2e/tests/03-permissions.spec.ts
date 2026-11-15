import { test, expect } from '@playwright/test';
import { login, logout, uniqueSuffix } from '../helpers/auth';

test.describe.serial('Permissions in the UI', () => {
  const permProjectTitle = `[E2E] Permissions ${uniqueSuffix()}`;
  let permProjectUrl = '';

  test('setup: patel creates project, adds milestone, tests team cap and lead protection', async ({
    page,
  }) => {
    await login(page, 'patel@demo.projecthub.test');

    await page.goto('/projects/new');
    await page.getByLabel(/project title/i).fill(permProjectTitle);
    await page.getByLabel(/project scope & description/i).fill(
      'Project for testing role and membership permissions.'
    );

    // Guide is Sharma
    await page.getByLabel(/faculty guide/i).selectOption({ label: 'Dr. Rajesh Sharma (Demo) (sharma@demo.projecthub.test)' });
    await page.getByRole('button', { name: /create capstone project/i }).click();

    await page.waitForURL(/\/projects\/[0-9a-f-]+/);
    permProjectUrl = page.url();

    // Add milestone
    await page.getByRole('button', { name: /add milestone/i }).click();
    await page.getByLabel(/milestone title/i).fill('Perm Milestone');
    await page.getByRole('button', { name: /add milestone/i }).last().click();
    await expect(page.getByText('Perm Milestone')).toBeVisible();

    // Add 2nd member: Rao
    await page.getByRole('button', { name: /add member/i }).click();
    await page.getByPlaceholder(/student@demo/i).fill('rao@demo.projecthub.test');
    await page.getByRole('button', { name: /search/i }).click();
    await expect(page.getByText('Diya Rao (Demo)')).toBeVisible();
    await page.getByRole('dialog').getByRole('button', { name: 'Add', exact: true }).click();
    await expect(page.getByText('Diya Rao (Demo)')).toBeVisible();

    // Add 3rd member: Nair (allowed)
    await page.getByRole('button', { name: /add member/i }).click();
    await page.getByPlaceholder(/student@demo/i).fill('nair@demo.projecthub.test');
    await page.getByRole('button', { name: /search/i }).click();
    await expect(page.getByText('Kavya Nair (Demo)')).toBeVisible();
    await page.getByRole('dialog').getByRole('button', { name: 'Add', exact: true }).click();
    await expect(page.getByText('Kavya Nair (Demo)')).toBeVisible();

    // Team is now at cap (3 members) -> Team cap message is displayed
    await expect(
      page.getByText(/team has reached the maximum cap of 3 students/i)
    ).toBeVisible();
    // Add Member button is not visible
    await expect(page.getByRole('button', { name: /add member/i })).not.toBeVisible();

    // Assert that the Lead (Aarav Patel) has NO remove button
    const leadRemoveBtn = page.getByRole('button', { name: /remove aarav patel/i });
    await expect(leadRemoveBtn).not.toBeVisible();

    // Non-lead members have a remove button
    const memberRemoveBtn = page.getByRole('button', { name: /remove diya rao/i });
    await expect(memberRemoveBtn).toBeVisible();

    await logout(page);
  });

  test('rao (non-creator member) sees milestone controls but no edit, submit or team-management controls', async ({
    page,
  }) => {
    await login(page, 'rao@demo.projecthub.test');

    await page.goto(permProjectUrl);

    // Can see milestone controls (e.g. Add Milestone / milestone toggle)
    await expect(page.getByRole('button', { name: /add milestone/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /mark complete/i })).toBeVisible();

    // Cannot see edit project details
    await expect(page.getByRole('button', { name: /edit details/i })).not.toBeVisible();

    // Cannot see submit proposal
    await expect(page.getByRole('button', { name: /submit proposal/i })).not.toBeVisible();

    // Cannot manage team (no add member, no remove member buttons)
    await expect(page.getByRole('button', { name: /add member/i })).not.toBeVisible();
    await expect(page.getByRole('button', { name: /remove/i })).not.toBeVisible();

    await logout(page);
  });

  test('singh (non-guide faculty) sees no action buttons or comment box, but sees drafts in All Projects', async ({
    page,
  }) => {
    await login(page, 'singh@demo.projecthub.test');

    // 1. Check All Projects includes draft projects from other students
    await page.goto('/projects');
    // Search or look for drafts
    await expect(page.getByTestId('badge-DRAFT').first()).toBeVisible();

    // 2. Open the permissions project
    await page.goto(permProjectUrl);
    await expect(page.getByRole('heading', { name: permProjectTitle, level: 1 })).toBeVisible();

    // Cannot see review buttons or complete button
    await expect(page.getByRole('button', { name: /approve proposal/i })).not.toBeVisible();
    await expect(page.getByRole('button', { name: /request revisions/i })).not.toBeVisible();
    await expect(page.getByRole('button', { name: /reject proposal/i })).not.toBeVisible();
    await expect(page.getByRole('button', { name: /complete project/i })).not.toBeVisible();

    // Cannot see feedback/comment submission form
    await expect(page.getByRole('button', { name: /post feedback/i })).not.toBeVisible();
    await expect(page.getByPlaceholder(/add constructive feedback/i)).not.toBeVisible();

    await logout(page);
  });

  test('gupta (non-member student) gets Not found state and does not see project in My Projects', async ({
    page,
  }) => {
    await login(page, 'gupta@demo.projecthub.test');

    // 1. My Projects list does not contain permProjectTitle
    await page.goto('/projects');
    await expect(page.getByText(permProjectTitle)).not.toBeVisible();

    // 2. Navigating directly to permProjectUrl gives Not found state
    await page.goto(permProjectUrl);
    await expect(page.getByText(/project not found/i)).toBeVisible();
    await expect(page.getByText(/does not exist or has been deleted/i)).toBeVisible();

    await logout(page);
  });
});
