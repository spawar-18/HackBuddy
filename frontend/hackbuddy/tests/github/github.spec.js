import { test, expect } from '@playwright/test';
import { AuthPage } from '../page-objects/AuthPage.js';
import { GitHubPage } from '../page-objects/GitHubPage.js';
import { setupRouteMocks } from '../helpers/routeMock.js';

test.describe('GitHub Integration Tests', () => {
  test.beforeEach(async ({ page }) => {
    await setupRouteMocks(page);
    
    // Log in first
    const authPage = new AuthPage(page);
    await authPage.gotoLogin();
    await authPage.login('sahil@vibecoders.com', 'password123');
    
    // Navigate directly to project workspace and select github tab
    await page.goto('/workspace/proj_1');
  });

  test('GitHub panel loads analytics metrics', async ({ page }) => {
    const gitHubPage = new GitHubPage(page);
    await expect(gitHubPage.commitsTab).toBeVisible();

    // Sync button should be visible
    await expect(gitHubPage.syncBtn).toBeVisible();
    await gitHubPage.syncRepository();

    // Verify commit count shows properly
    const commitsStat = page.locator('.dashboard-card:has-text("Commits Today")');
    await expect(commitsStat).toContainText('12');
  });

  test('GitHub commits tab renders recent commit listings', async ({ page }) => {
    const gitHubPage = new GitHubPage(page);
    await gitHubPage.commitsTab.click();

    // Recent commits list should be visible
    await expect(gitHubPage.commitItems.first()).toBeVisible();
    await expect(gitHubPage.commitItems.first()).toContainText('feat:');
  });

  test('GitHub pull requests and issues list is loaded', async ({ page }) => {
    const gitHubPage = new GitHubPage(page);
    await gitHubPage.overviewTab.click();

    // Verify open issues and pull requests links exist
    await expect(gitHubPage.prItems.first()).toBeVisible();
    await expect(gitHubPage.issueItems.first()).toBeVisible();
  });
});
