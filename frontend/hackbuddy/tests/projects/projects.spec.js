import { test, expect } from '@playwright/test';
import { AuthPage } from '../page-objects/AuthPage.js';
import { ProjectPage } from '../page-objects/ProjectPage.js';
import { setupRouteMocks } from '../helpers/routeMock.js';

test.describe('Project Tests', () => {
  test.beforeEach(async ({ page }) => {
    await setupRouteMocks(page);
    
    // Log in first
    const authPage = new AuthPage(page);
    await authPage.gotoLogin();
    await authPage.login('sahil@vibecoders.com', 'password123');
  });

  test('User can create a project profile within a team', async ({ page }) => {
    const projectPage = new ProjectPage(page);
    
    // Navigate to team details (where projects are listed/created)
    await page.goto('/team/team_1');
    
    // Select create project button in ProjectHub
    const openCreateBtn = page.locator('button:has-text("Create Project Profile")');
    if (await openCreateBtn.isVisible()) {
      await openCreateBtn.click();
    }
    
    // Create Project
    await projectPage.createProject(
      'HackVerse Copilot',
      'Cluttered dashboards are difficult to manage.',
      'AI assistant dashboard for hackathon squads.',
      'AI/ML Track',
      '36h'
    );
    
    // Verify project name card exists on project hub
    await expect(page.locator('h3:has-text("HackVerse Copilot")')).toBeVisible();
  });

  test('Project workspace redirects and switches views', async ({ page }) => {
    await page.goto('/team/team_1');
    
    const projectPage = new ProjectPage(page);
    await expect(projectPage.projectWorkspaceLink).toBeVisible();
    await projectPage.openWorkspace();
    
    // Should be in project workspace
    await expect(page).toHaveURL(/\/workspace\/proj_1/);
  });
});
