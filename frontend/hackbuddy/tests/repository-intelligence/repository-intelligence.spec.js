import { test, expect } from '@playwright/test';
import { AuthPage } from '../page-objects/AuthPage.js';
import { GitHubPage } from '../page-objects/GitHubPage.js';
import { setupRouteMocks } from '../helpers/routeMock.js';

test.describe('Repository Intelligence Tests', () => {
  test.beforeEach(async ({ page }) => {
    await setupRouteMocks(page);
    
    // Log in first
    const authPage = new AuthPage(page);
    await authPage.gotoLogin();
    await authPage.login('sahil@vibecoders.com', 'password123');
    
    // Navigate directly to project workspace
    await page.goto('/workspace/proj_1');
  });

  test('GitHub AI Analysis tab displays intelligence insights', async ({ page }) => {
    const gitHubPage = new GitHubPage(page);
    await gitHubPage.aiAnalysisTab.click();

    // Verify AI analysis section header
    const aiTitle = page.locator('div:has-text("AI Repository Analysis")');
    await expect(aiTitle).toBeVisible();

    // Verify AI health score status
    const healthBadge = page.locator('.inline-flex:has-text("Excellent")');
    await expect(healthBadge).toBeVisible();

    // Run re-analysis
    await gitHubPage.runAIAnalysis();

    // Verify recommendations exists
    const recommendationCard = page.locator('div:has-text("AI Recommendations")');
    await expect(recommendationCard).toBeVisible();
    await expect(recommendationCard).toContainText('viewport');
  });
});
