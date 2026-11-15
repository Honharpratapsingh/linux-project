import { Page, expect } from '@playwright/test';

export function getE2EPassword(): string {
  const pw = process.env.E2E_PASSWORD;
  if (!pw) {
    throw new Error('E2E_PASSWORD environment variable is required.');
  }
  return pw;
}

export function uniqueSuffix(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
}

export function uniqueTitle(prefix: string = 'Flow'): string {
  return `[E2E] ${prefix} ${uniqueSuffix()}`;
}

export async function login(page: Page, email: string, password?: string): Promise<void> {
  const pw = password || getE2EPassword();
  await page.goto('/login');
  await page.waitForLoadState('domcontentloaded');

  await page.getByLabel(/email address/i).fill(email);
  await page.getByLabel(/password/i).fill(pw);
  await page.getByRole('button', { name: /sign in/i }).click();

  await expect(page).not.toHaveURL(/\/login/);
}

export async function logout(page: Page): Promise<void> {
  const signoutBtn = page.getByRole('button', { name: /sign out|logout/i });
  await signoutBtn.click();
  await expect(page).toHaveURL(/\/login/);
}
