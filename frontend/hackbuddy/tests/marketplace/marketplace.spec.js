import { test, expect } from '@playwright/test';
import { AuthPage } from '../page-objects/AuthPage.js';
import { setupRouteMocks } from '../helpers/routeMock.js';

test.describe('Task Marketplace Tests', () => {
  test.beforeEach(async ({ page }) => {
    await setupRouteMocks(page);
    
    // Log in first
    const authPage = new AuthPage(page);
    await authPage.gotoLogin();
    await authPage.login('sahil@vibecoders.com', 'password123');
    
    // Navigate directly to project workspace
    await page.goto('/workspace/proj_1');
  });

  test('Marketplace loads and switches tabs successfully', async ({ page }) => {
    const tabButton = page.locator('button:has-text("Marketplace")');
    await tabButton.click();

    // Verify marketplace default board loads
    const myTasksTab = page.locator('button:has-text("My Tasks")');
    await expect(myTasksTab).toBeVisible();

    const marketplaceBoardTab = page.locator('button:has-text("Marketplace Board")');
    await expect(marketplaceBoardTab).toBeVisible();
    await marketplaceBoardTab.click();

    const pendingRequestsTab = page.locator('button:has-text("Pending Requests")');
    await expect(pendingRequestsTab).toBeVisible();
  });
});
