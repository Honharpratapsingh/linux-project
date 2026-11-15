import { test, expect } from '@playwright/test';
import { login, logout, uniqueSuffix } from '../helpers/auth';

test.describe.serial('Archive, Restore, and Delete Workflows', () => {
  test('patel archives own DRAFT, sees it under Archived, restores it, and status is unchanged', async ({
    page,
  }) => {
    const draftTitle = `[E2E] Draft Archive ${uniqueSuffix()}`;

    await login(page, 'patel@demo.projecthub.test');

    // Create DRAFT project
    await page.goto('/projects/new');
    await page.getByLabel(/project title/i).fill(draftTitle);
    await page.getByLabel(/project scope & description/i).fill('Draft project to verify archive and restore.');
    await page.getByLabel(/faculty guide/i).selectOption({ label: 'Dr. Rajesh Sharma (Demo) (sharma@demo.projecthub.test)' });
    await page.getByRole('button', { name: /create capstone project/i }).click();

    await page.waitForURL(/\/projects\/[0-9a-f-]+/);
    const draftUrl = page.url();

    // Verify DRAFT status
    await expect(page.getByTestId('badge-DRAFT')).toHaveText(/draft/i);

    // Archive project
    await page.getByRole('button', { name: 'Archive Project', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Archive', exact: true }).click();

    // Archived badge is displayed
    await expect(page.getByTestId('badge-archived')).toBeVisible();

    // Check Archived page
    await page.goto('/archived');
    await expect(page.getByText(draftTitle)).toBeVisible();

    // Open project and restore
    await page.goto(draftUrl);
    await page.getByRole('button', { name: 'Restore Project', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Restore', exact: true }).click();

    // Status is still DRAFT and archived badge is gone
    await expect(page.getByTestId('badge-DRAFT')).toHaveText(/draft/i);
    await expect(page.getByTestId('badge-archived')).not.toBeVisible();

    // Submit project to PENDING_REVIEW
    await page.getByRole('button', { name: /submit for review/i }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Submit Project', exact: true }).click();
    await expect(page.getByTestId('badge-PENDING_REVIEW')).toHaveText(/pending review/i);

    // Patel has NO archive button on non-draft project
    await expect(page.getByRole('button', { name: /archive project/i })).not.toBeVisible();

    await logout(page);
  });

  test('sharma archives completed project, sees under Archived, restores, archives, and deletes with confirm dialog', async ({
    page,
  }) => {
    const flowTitle = `[E2E] Complete Delete ${uniqueSuffix()}`;

    // 1. Patel creates and submits project
    await login(page, 'patel@demo.projecthub.test');
    await page.goto('/projects/new');
    await page.getByLabel(/project title/i).fill(flowTitle);
    await page.getByLabel(/project scope & description/i).fill('Project to be completed then archived and deleted.');
    await page.getByLabel(/faculty guide/i).selectOption({ label: 'Dr. Rajesh Sharma (Demo) (sharma@demo.projecthub.test)' });
    await page.getByRole('button', { name: /create capstone project/i }).click();

    await page.waitForURL(/\/projects\/[0-9a-f-]+/);
    const completedUrl = page.url();

    // Add a milestone
    await page.getByRole('button', { name: /add milestone/i }).click();
    await page.getByLabel(/milestone title/i).fill('Milestone');
    await page.getByRole('button', { name: /add milestone/i }).last().click();

    // Submit
    await page.getByRole('button', { name: /submit for review/i }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Submit Project', exact: true }).click();
    await expect(page.getByTestId('badge-PENDING_REVIEW')).toBeVisible();
    await logout(page);

    // 2. Sharma approves
    await login(page, 'sharma@demo.projecthub.test');
    await page.goto(completedUrl);
    await page.getByRole('button', { name: /approve proposal/i }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Approve', exact: true }).click();
    await expect(page.getByTestId('badge-IN_PROGRESS')).toBeVisible();
    await logout(page);

    // 3. Patel marks milestone complete
    await login(page, 'patel@demo.projecthub.test');
    await page.goto(completedUrl);
    await page.getByRole('button', { name: /mark complete/i }).click();
    await expect(page.getByText('100%')).toBeVisible();
    await logout(page);

    // 4. Sharma completes project
    await login(page, 'sharma@demo.projecthub.test');
    await page.goto(completedUrl);
    const completeBtn = page.getByRole('button', { name: /complete project/i });
    await expect(completeBtn).toBeEnabled();
    await completeBtn.click();
    await page.getByRole('dialog').getByRole('button', { name: 'Mark Completed', exact: true }).click();
    await expect(page.getByTestId('badge-COMPLETED')).toBeVisible();

    // 5. Sharma archives the completed project
    await page.getByRole('button', { name: 'Archive Project', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Archive', exact: true }).click();
    await expect(page.getByTestId('badge-archived')).toBeVisible();

    // 6. Sees it under Archived
    await page.goto('/archived');
    await expect(page.getByText(flowTitle)).toBeVisible();

    // 7. Restores it
    await page.goto(completedUrl);
    await page.getByRole('button', { name: 'Restore Project', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Restore', exact: true }).click();
    await expect(page.getByTestId('badge-archived')).not.toBeVisible();
    await expect(page.getByTestId('badge-COMPLETED')).toBeVisible();

    // 8. Archives it again
    await page.getByRole('button', { name: 'Archive Project', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Archive', exact: true }).click();
    await expect(page.getByTestId('badge-archived')).toBeVisible();

    // 9. Deletes it with confirm dialog
    await page.getByRole('button', { name: 'Delete Project', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Delete Permanently', exact: true }).click();

    // Afterwards its URL shows Not found for Sharma
    await page.goto(completedUrl);
    await expect(page.getByText(/project not found/i)).toBeVisible();

    // And absent from lists
    await page.goto('/projects');
    await expect(page.getByText(flowTitle)).not.toBeVisible();
    await page.goto('/archived');
    await expect(page.getByText(flowTitle)).not.toBeVisible();

    await logout(page);

    // 10. URL shows Not found for Patel too and absent from Patel's lists
    await login(page, 'patel@demo.projecthub.test');
    await page.goto(completedUrl);
    await expect(page.getByText(/project not found/i)).toBeVisible();
    await page.goto('/projects');
    await expect(page.getByText(flowTitle)).not.toBeVisible();
    await logout(page);
  });
});
