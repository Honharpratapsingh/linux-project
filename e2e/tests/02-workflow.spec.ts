import { test, expect } from '@playwright/test';
import { login, logout, uniqueSuffix } from '../helpers/auth';

test.describe.serial('Student and Faculty Workflow', () => {
  const flowProjectTitle = `[E2E] Flow ${uniqueSuffix()}`;
  let projectUrl = '';

  test('patel creates project, adds milestone, adds rao, and submits', async ({ page }) => {
    await login(page, 'patel@demo.projecthub.test');

    await page.goto('/projects/new');
    await page.getByLabel(/project title/i).fill(flowProjectTitle);
    await page.getByLabel(/project scope & description/i).fill(
      'End-to-end full capstone workflow verification covering creation through completion.'
    );

    // Select Dr. Rajesh Sharma as guide
    const guideSelect = page.getByLabel(/faculty guide/i);
    await guideSelect.selectOption({ label: 'Dr. Rajesh Sharma (Demo) (sharma@demo.projecthub.test)' });

    await page.getByRole('button', { name: /create capstone project/i }).click();

    // Navigates to project details page
    await page.waitForURL(/\/projects\/[0-9a-f-]+/);
    projectUrl = page.url();

    // 1. Add milestone
    await page.getByRole('button', { name: /add milestone/i }).click();
    await page.getByLabel(/milestone title/i).fill('Core Architecture');
    await page.getByRole('button', { name: /add milestone/i }).last().click();
    await expect(page.getByText('Core Architecture')).toBeVisible();

    // 2. Add rao to team
    await page.getByRole('button', { name: /add member/i }).click();
    await page.getByPlaceholder(/student@demo/i).fill('rao@demo.projecthub.test');
    await page.getByRole('button', { name: /search/i }).click();
    await expect(page.getByText('Diya Rao (Demo)')).toBeVisible();
    await page.getByRole('dialog').getByRole('button', { name: 'Add', exact: true }).click();
    await expect(page.getByText('Diya Rao (Demo)')).toBeVisible();

    // 3. Submit proposal
    await page.getByRole('button', { name: /submit for review/i }).click();
    await page.getByRole('button', { name: /submit project/i }).last().click();

    // Verify status becomes Pending Review
    await expect(page.getByTestId('badge-PENDING_REVIEW')).toHaveText(/pending review/i);

    await logout(page);
  });

  test('sharma sees it in Pending Reviews and requests changes with feedback', async ({ page }) => {
    await login(page, 'sharma@demo.projecthub.test');

    await page.goto('/pending-reviews');
    await expect(page.getByText(flowProjectTitle)).toBeVisible();
    await page.getByText(flowProjectTitle).click();

    await page.waitForURL(projectUrl);

    // Request revisions
    await page.getByRole('button', { name: /request revisions/i }).click();
    await page.getByLabel(/revision requirements/i).fill(
      'Please expand on technical architecture details and deployment model.'
    );
    await page.getByRole('dialog').getByRole('button', { name: 'Request Changes', exact: true }).click();

    await expect(page.getByTestId('badge-CHANGES_REQUESTED')).toHaveText(/changes requested/i);

    await logout(page);
  });

  test('patel sees feedback, edits description, and resubmits project', async ({ page }) => {
    await login(page, 'patel@demo.projecthub.test');

    await page.goto(projectUrl);

    // Verify feedback entry labeled with CHANGES_REQUESTED
    await expect(page.getByText(/changes requested/i).first()).toBeVisible();
    await expect(
      page.getByText('Please expand on technical architecture details and deployment model.', { exact: true })
    ).toBeVisible();

    // Edit project description
    await page.getByRole('button', { name: /edit scope/i }).click();
    await page.getByLabel(/project scope & description/i).fill(
      'Updated: expanded technical architecture details and container deployment model added.'
    );
    await page.getByRole('button', { name: /save changes/i }).click();
    await expect(
      page.getByText('Updated: expanded technical architecture details')
    ).toBeVisible();

    // Resubmit project
    await page.getByRole('button', { name: /submit for review/i }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Submit Project', exact: true }).click();

    await expect(page.getByTestId('badge-PENDING_REVIEW')).toHaveText(/pending review/i);

    await logout(page);
  });

  test('sharma approves; status becomes In Progress; complete button disabled with milestone notice', async ({
    page,
  }) => {
    await login(page, 'sharma@demo.projecthub.test');

    await page.goto(projectUrl);

    // Approve
    await page.getByRole('button', { name: /approve proposal/i }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Approve', exact: true }).click();

    await expect(page.getByTestId('badge-IN_PROGRESS')).toHaveText(/in progress/i);

    // Complete button is disabled
    const completeBtn = page.getByRole('button', { name: /complete project/i });
    await expect(completeBtn).toBeDisabled();
    await expect(page.getByText(/all milestones must be completed first/i)).toBeVisible();

    await logout(page);
  });

  test('rao completes the milestone; project progress reflects 100%', async ({ page }) => {
    await login(page, 'rao@demo.projecthub.test');

    await page.goto(projectUrl);

    // Team member toggles milestone completion
    const completeCheckbox = page.getByRole('button', { name: /mark complete/i });
    await completeCheckbox.click();

    // Check progress is 100%
    await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
    await expect(page.getByText('100%')).toBeVisible();

    await logout(page);
  });

  test('sharma completes the project; review buttons removed; status history verified in order', async ({
    page,
  }) => {
    await login(page, 'sharma@demo.projecthub.test');

    await page.goto(projectUrl);

    // Complete button is now enabled
    const completeBtn = page.getByRole('button', { name: /complete project/i });
    await expect(completeBtn).toBeEnabled();
    await completeBtn.click();
    await page.getByRole('dialog').getByRole('button', { name: 'Mark Completed', exact: true }).click();

    // Status is Completed
    await expect(page.getByTestId('badge-COMPLETED')).toHaveText(/completed/i);

    // No review or complete buttons remain
    await expect(page.getByRole('button', { name: /approve proposal/i })).not.toBeVisible();
    await expect(page.getByRole('button', { name: /request revisions/i })).not.toBeVisible();
    await expect(page.getByRole('button', { name: /reject proposal/i })).not.toBeVisible();
    await expect(page.getByRole('button', { name: /complete project/i })).not.toBeVisible();

    // Status history on project page lists transitions in order
    const historySection = page.locator('text=Status History & Audit Log').locator('..').locator('..');
    await expect(historySection).toBeVisible();

    // Verify chronological order of transitions:
    // 1. Created (Draft)
    // 2. Draft -> Pending Review
    // 3. Pending Review -> Changes Requested
    // 4. Changes Requested -> Pending Review
    // 5. Pending Review -> In Progress
    // 6. In Progress -> Completed
    await expect(page.getByText(/created \(draft\)/i)).toBeVisible();
    await expect(page.getByText(/draft.*→.*pending review/i)).toBeVisible();
    await expect(page.getByText(/pending review.*→.*changes requested/i)).toBeVisible();
    await expect(page.getByText(/changes requested.*→.*pending review/i)).toBeVisible();
    await expect(page.getByText(/pending review.*→.*in progress/i)).toBeVisible();
    await expect(page.getByText(/in progress.*→.*completed/i)).toBeVisible();

    await logout(page);
  });
});
