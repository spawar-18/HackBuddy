import { test, expect } from '@playwright/test';
import { AuthPage } from '../page-objects/AuthPage.js';
import { setupRouteMocks } from '../helpers/routeMock.js';

test.describe('Responsiveness Layout Tests', () => {
  test.beforeEach(async ({ page }) => {
    await setupRouteMocks(page);
    
    // Log in first
    const authPage = new AuthPage(page);
    await authPage.gotoLogin();
    await authPage.login('sahil@vibecoders.com', 'password123');
  });

  const viewports = [
    { name: 'Desktop Large', width: 1440, height: 900 },
    { name: 'Laptop Standard', width: 1280, height: 800 },
    { name: 'Tablet Portrait', width: 768, height: 1024 },
    { name: 'Mobile Portrait', width: 375, height: 812 }
  ];

  for (const viewport of viewports) {
    test(`Responsive layout behaves correctly on ${viewport.name}`, async ({ page }) => {
      // Set viewport size
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/dashboard');

      // Verify the main container is visible
      const mainContainer = page.locator('.dashboard-container');
      await expect(mainContainer).toBeVisible();

      // Check header visibility
      const header = page.locator('header');
      await expect(header).toBeVisible();
    });
  }
});
