import { test, expect } from '@playwright/test';
import { AuthPage } from '../page-objects/AuthPage.js';
import { CommandCenterPage } from '../page-objects/CommandCenterPage.js';
import { setupRouteMocks } from '../helpers/routeMock.js';

test.describe('Command Center Tests', () => {
  test.beforeEach(async ({ page }) => {
    await setupRouteMocks(page);
    
    // Log in first
    const authPage = new AuthPage(page);
    await authPage.gotoLogin();
    await authPage.login('sahil@vibecoders.com', 'password123');
    
    // Navigate directly to project workspace
    await page.goto('/workspace/proj_1');
  });

  test('Command Center displays milestone progress, metrics, and health indicators', async ({ page }) => {
    const commandPage = new CommandCenterPage(page);
    await commandPage.selectTab();

    // Verify Project Health indicator
    await expect(commandPage.projectHealthText).toBeVisible();

    // Verify Winning Probability indicator
    await expect(commandPage.winningProbabilityText).toBeVisible();

    // Verify Timeline elements
    const timelineHeader = page.locator('span:has-text("Timeline Log")');
    await expect(timelineHeader).toBeVisible();
  });
});
