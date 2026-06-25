import { test, expect } from '@playwright/test';
import { AuthPage } from '../page-objects/AuthPage.js';
import { TaskSplitterPage } from '../page-objects/TaskSplitterPage.js';
import { setupRouteMocks } from '../helpers/routeMock.js';

test.describe('Task Splitter Tests', () => {
  test.beforeEach(async ({ page }) => {
    await setupRouteMocks(page);
    
    // Log in first
    const authPage = new AuthPage(page);
    await authPage.gotoLogin();
    await authPage.login('sahil@vibecoders.com', 'password123');
    
    // Navigate directly to project workspace
    await page.goto('/workspace/proj_1');
  });

  test('AI Task splitter renders generated assignments and deliverables', async ({ page }) => {
    const splitterPage = new TaskSplitterPage(page);
    await splitterPage.selectTab();

    // Verify task plan layout
    await expect(splitterPage.taskPlanHeader).toBeVisible();
    
    // Verify member allocation sections are visible
    await expect(splitterPage.assignmentGroup.first()).toBeVisible();
    await expect(splitterPage.assignmentGroup).toContainText('Sahil Ojha');
  });

  test('AI Task allocation contains specific tasks', async ({ page }) => {
    const splitterPage = new TaskSplitterPage(page);
    await splitterPage.selectTab();

    // Verify authentication task exists
    await expect(page.locator('div:has-text("Write authentication mocks")')).toBeVisible();

    // Verify deployment task exists
    await expect(page.locator('div:has-text("Deployment pipeline validation")')).toBeVisible();

    // Verify testing/playwright task exists
    await expect(splitterPage.taskItem).toBeVisible();
  });
});
