import { test, expect } from '@playwright/test';
import { getE2EPassword, uniqueSuffix } from '../helpers/auth';

test.describe('Profile Management', () => {
  test('throwaway student updates full name, verifies read-only fields, updates password, and confirms session persists', async ({
    page,
  }) => {
    const suffix = uniqueSuffix();
    const originalName = `[E2E] Student ${suffix}`;
    const updatedName = `[E2E] Student Updated ${suffix}`;
    const email = `profile_${suffix}@example.com`;
    const regNumber = `RA${Date.now().toString().slice(-8)}`;
    const originalPassword = getE2EPassword();
    const newPassword = `${originalPassword}-new123`;

    // 1. Register a fresh throwaway student
    await page.goto('/register');
    await page.getByLabel(/full name/i).fill(originalName);
    await page.getByLabel(/registration number/i).fill(regNumber);
    await page.getByLabel(/email address/i).fill(email);
    await page.getByLabel(/password/i).fill(originalPassword);
    await page.getByRole('button', { name: /create account/i }).click();

    await expect(page).toHaveURL(/\/overview/);

    // 2. Navigate to Profile page
    await page.goto('/profile');

    // 3. Verify email and role are shown read-only
    await expect(page.getByText(/email address \(read-only\)/i)).toBeVisible();
    await expect(page.getByText(email)).toBeVisible();
    await expect(page.getByText(/account role \(read-only\)/i)).toBeVisible();
    await expect(page.getByText('STUDENT', { exact: true })).toBeVisible();

    // 4. Change full name
    const nameInput = page.getByLabel(/full name/i);
    await nameInput.fill(updatedName);
    await page.getByRole('button', { name: /save name/i }).click();

    // Verify success toast or updated text in Topbar/profile
    await expect(page.getByText(/name updated successfully/i)).toBeVisible();
    await expect(page.getByText(updatedName)).toBeVisible();

    // 5. Change password with current password
    await page.getByLabel(/current password/i).fill(originalPassword);
    await page.getByLabel(/new password/i).fill(newPassword);
    await page.getByRole('button', { name: /update password/i }).click();

    await expect(
      page.getByText(/password changed successfully\. your session remains active\./i)
    ).toBeVisible();

    // 6. Confirm session still works without re-login
    await page.goto('/overview');
    await expect(page).toHaveURL(/\/overview/);
    await expect(page.getByText(updatedName)).toBeVisible();
  });
});
