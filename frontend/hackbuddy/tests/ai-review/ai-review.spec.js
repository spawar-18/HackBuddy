import { test, expect } from '@playwright/test';
import { AuthPage } from '../page-objects/AuthPage.js';
import { AIReviewPage } from '../page-objects/AIReviewPage.js';
import { setupRouteMocks } from '../helpers/routeMock.js';

test.describe('AI Project Review Tests', () => {
  test.beforeEach(async ({ page }) => {
    await setupRouteMocks(page);
    
    // Log in first
    const authPage = new AuthPage(page);
    await authPage.gotoLogin();
    await authPage.login('sahil@vibecoders.com', 'password123');
    
    // Navigate directly to project workspace
    await page.goto('/workspace/proj_1');
  });

  test('AI Feasibility score, risks, and suggestions are rendered', async ({ page }) => {
    const reviewPage = new AIReviewPage(page);
    await reviewPage.selectTab();

    // Verify AI Feasibility review elements are rendered
    await expect(reviewPage.reviewHeader).toBeVisible();
    await expect(reviewPage.feasibilityScore).toBeVisible();
    
    // Verify risks header is visible
    await expect(reviewPage.risksHeader).toBeVisible();
    
    // Verify recommendations/suggestions header is visible
    await expect(reviewPage.suggestionsHeader).toBeVisible();
  });

  test('User can trigger analysis regeneration', async ({ page }) => {
    const reviewPage = new AIReviewPage(page);
    await reviewPage.selectTab();
    
    // Perform regeneration trigger
    await reviewPage.triggerAnalysis();
    
    // Verify review header is still visible after request
    await expect(reviewPage.reviewHeader).toBeVisible();
  });
});
