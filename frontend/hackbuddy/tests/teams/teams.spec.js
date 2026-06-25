import { test, expect } from '@playwright/test';
import { AuthPage } from '../page-objects/AuthPage.js';
import { TeamPage } from '../page-objects/TeamPage.js';
import { setupRouteMocks } from '../helpers/routeMock.js';

test.describe('Team Tests', () => {
  test.beforeEach(async ({ page }) => {
    await setupRouteMocks(page);
    
    // Log in first
    const authPage = new AuthPage(page);
    await authPage.gotoLogin();
    await authPage.login('sahil@vibecoders.com', 'password123');
  });

  test('User can create a new team successfully', async ({ page }) => {
    const teamPage = new TeamPage(page);
    await teamPage.gotoCreate();

    // Create team
    await teamPage.createTeam('Vibecoders Spec Team', 'Playwright spec validation squad.');

    // Should redirect to team details page
    await expect(page).toHaveURL(/\/team\/team_1/);
  });

  test('User can join a team via invite code', async ({ page }) => {
    const teamPage = new TeamPage(page);
    await teamPage.gotoJoin();

    // Join team
    await teamPage.joinTeam('VIBE99');

    // Should redirect to joined team's workspace/details
    await expect(page).toHaveURL(/\/team\/team_1/);
  });

  test('Team details shows members and actions', async ({ page }) => {
    // Navigate directly to team details
    await page.goto('/team/team_1');
    
    // Invite code display
    const code = page.locator('.code-val');
    await expect(code).toContainText('VIBE99');
    
    // Verify member item exists
    const memberName = page.locator('span:has-text("Nikhil Ojha")');
    await expect(memberName).toBeVisible();
  });
});
