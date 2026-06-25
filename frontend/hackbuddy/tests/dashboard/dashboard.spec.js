import { test, expect } from '@playwright/test';
import { AuthPage } from '../page-objects/AuthPage.js';
import { DashboardPage } from '../page-objects/DashboardPage.js';
import { setupRouteMocks } from '../helpers/routeMock.js';

test.describe('Dashboard Tests', () => {
  test.beforeEach(async ({ page }) => {
    await setupRouteMocks(page);
    
    // Log in first
    const authPage = new AuthPage(page);
    await authPage.gotoLogin();
    await authPage.login('sahil@vibecoders.com', 'password123');
  });

  test('Dashboard displays projects and profile details', async ({ page }) => {
    const dashboardPage = new DashboardPage(page);
    await dashboardPage.goto();

    // Verify workspace summary cards are present
    const projectsSummary = page.locator('.dashboard-card:has-text("Projects")');
    await expect(projectsSummary).toContainText('1');

    // Verify project name card exists
    await expect(dashboardPage.projectCard).toBeVisible();
    await expect(dashboardPage.projectCard).toContainText('HackVerse Copilot');
    
    // Verify progress circular chart is rendered
    await expect(dashboardPage.circularProgress).toBeVisible();
  });

  test('User can switch active projects via dropdown', async ({ page }) => {
    const dashboardPage = new DashboardPage(page);
    await dashboardPage.goto();
    
    // Switch project
    await expect(dashboardPage.projectSelector).toBeVisible();
    await dashboardPage.selectProject('HackVerse Copilot');
  });

  test('Quick actions launch review dialogs', async ({ page }) => {
    const dashboardPage = new DashboardPage(page);
    await dashboardPage.goto();

    // Trigger quick AI review
    await dashboardPage.triggerQuickAIReview();
    
    // Popup review verdict header should be visible
    const verdictHeader = page.locator('span:has-text("QUICK AI PITCH VERDICT")');
    await expect(verdictHeader).toBeVisible();
  });

  test('Quick AI Assistant button redirects to workspace chat', async ({ page }) => {
    const dashboardPage = new DashboardPage(page);
    await dashboardPage.goto();
    
    await dashboardPage.openAiAssistantBtn.click();
    await expect(page).toHaveURL(/\/workspace\/proj_1/);
  });
});
