import { test, expect } from '@playwright/test';
import { AuthPage } from '../page-objects/AuthPage.js';
import { StackConsensusPage } from '../page-objects/StackConsensusPage.js';
import { setupRouteMocks } from '../helpers/routeMock.js';

test.describe('Stack Consensus Tests', () => {
  test.beforeEach(async ({ page }) => {
    await setupRouteMocks(page);
    
    // Log in first
    const authPage = new AuthPage(page);
    await authPage.gotoLogin();
    await authPage.login('sahil@vibecoders.com', 'password123');
    
    // Navigate directly to project team details page
    await page.goto('/team/team_1');
    
    // Open Stack Consensus inside project hub
    const consensusTrigger = page.locator('button:has-text("AI Stack Consensus Engine")');
    if (await consensusTrigger.isVisible()) {
      await consensusTrigger.click();
    }
  });

  test('Consensus dashboard renders proposal details', async ({ page }) => {
    const consensusPage = new StackConsensusPage(page);
    
    // Verify consensus page elements are visible
    await expect(consensusPage.consensusHeader).toBeVisible();
    await expect(page.locator('div:has-text("React + Vite")').first()).toBeVisible();
  });

  test('User can vote on the proposed tech stack', async ({ page }) => {
    const consensusPage = new StackConsensusPage(page);
    
    // Verify voting action is present
    await expect(consensusPage.voteApproveButton).toBeVisible();
    
    // Vote
    await consensusPage.voteApprove();
  });

  test('Consensus restart voting actions are visible', async ({ page }) => {
    const consensusPage = new StackConsensusPage(page);
    
    // Check restart button for Project Owner/Squad Leader
    await expect(consensusPage.restartConsensusBtn).toBeVisible();
  });
});
