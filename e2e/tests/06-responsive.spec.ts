import { test, expect } from '@playwright/test';
import { login, logout } from '../helpers/auth';

test.describe('Responsive Layout', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('at 390px viewport: drawer opens via menu button, tables scroll internally, and document.body has no horizontal scroll', async ({
    page,
  }) => {
    await login(page, 'sharma@demo.projecthub.test');

    // 1. Menu button is visible at 390px
    const menuBtn = page.getByRole('button', { name: /open menu/i });
    await expect(menuBtn).toBeVisible();

    // 2. Click menu button to open sidebar drawer
    await menuBtn.click();
    // Sidebar drawer contains navigation links (e.g. Overview, All Projects)
    const drawerNav = page.getByRole('navigation');
    const allProjectsLink = drawerNav.getByRole('link', { name: 'All Projects' });
    await expect(allProjectsLink).toBeVisible();

    // 3. Navigate to All Projects
    await allProjectsLink.click();
    await page.waitForURL(/\/projects/);

    // 4. Check tables scroll inside their own container
    const tableContainer = page.locator('div.overflow-x-auto');
    await expect(tableContainer.first()).toBeVisible();

    // 5. Assert document.body has no horizontal scroll (scrollWidth equals clientWidth)
    const bodyDimensions = await page.evaluate(() => {
      return {
        scrollWidth: document.body.scrollWidth,
        clientWidth: document.body.clientWidth,
      };
    });

    expect(bodyDimensions.scrollWidth).toBeLessThanOrEqual(bodyDimensions.clientWidth);

    await logout(page);
  });
});
