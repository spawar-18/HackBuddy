import { test, expect } from '@playwright/test';
import { AuthPage } from '../page-objects/AuthPage.js';
import { DashboardPage } from '../page-objects/DashboardPage.js';
import { setupRouteMocks } from '../helpers/routeMock.js';

test.describe('Notification Feed Tests', () => {
  test.beforeEach(async ({ page }) => {
    await setupRouteMocks(page);
    
    // Log in first
    const authPage = new AuthPage(page);
    await authPage.gotoLogin();
    await authPage.login('sahil@vibecoders.com', 'password123');
  });

  test('User can open and view the notifications feed dropdown panel', async ({ page }) => {
    const dashboardPage = new DashboardPage(page);
    await dashboardPage.goto();

    // Verify notifications button is present
    await expect(dashboardPage.notificationBell).toBeVisible();

    // Click bell
    await dashboardPage.openNotifications();

    // Verify dropdown is opened
    await expect(dashboardPage.notificationsPanel).toBeVisible();
    await expect(dashboardPage.notificationsPanel).toContainText('Notifications Feed');
  });
});
