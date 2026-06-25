import { test, expect } from '@playwright/test';
import { AuthPage } from '../page-objects/AuthPage.js';
import { TeamPage } from '../page-objects/TeamPage.js';
import { ProjectPage } from '../page-objects/ProjectPage.js';
import { AIReviewPage } from '../page-objects/AIReviewPage.js';
import { StackConsensusPage } from '../page-objects/StackConsensusPage.js';
import { TaskSplitterPage } from '../page-objects/TaskSplitterPage.js';
import { CommandCenterPage } from '../page-objects/CommandCenterPage.js';
import { GitHubPage } from '../page-objects/GitHubPage.js';
import { MentorChatPage } from '../page-objects/MentorChatPage.js';
import { setupRouteMocks } from '../helpers/routeMock.js';

test.describe('End-to-End Smoke Journey', () => {
  test.beforeEach(async ({ page }) => {
    await setupRouteMocks(page);
  });

  test('Perform complete HackVerse Copilot workspace E2E lifecycle', async ({ page }) => {
    // 1. LOGIN
    const authPage = new AuthPage(page);
    await authPage.gotoLogin();
    await authPage.login('sahil@vibecoders.com', 'password123');
    await expect(page).toHaveURL(/\/dashboard/);

    // 2. CREATE TEAM
    const teamPage = new TeamPage(page);
    await teamPage.gotoCreate();
    await teamPage.createTeam('Vibecoders E2E Team', 'Smoke test workflow team.');
    await expect(page).toHaveURL(/\/team\/team_1/);

    // 3. CREATE PROJECT
    const projectPage = new ProjectPage(page);
    await projectPage.createProject(
      'HackVerse Copilot',
      'Cluttered dashboards are difficult to manage.',
      'AI assistant dashboard for hackathon squads.',
      'AI/ML Track',
      '36h'
    );
    await expect(page.locator('h3:has-text("HackVerse Copilot")')).toBeVisible();

    // Navigate to Workspace
    await projectPage.openWorkspace();
    await expect(page).toHaveURL(/\/workspace\/proj_1/);

    // 4. GENERATE AI PROJECT REVIEW
    const reviewPage = new AIReviewPage(page);
    await reviewPage.selectTab();
    await expect(reviewPage.reviewHeader).toBeVisible();

    // 5. FINALIZE TECH STACK (Open Tech Stack view under team details)
    await page.goto('/team/team_1');
    const consensusTrigger = page.locator('button:has-text("AI Stack Consensus Engine")');
    if (await consensusTrigger.isVisible()) {
      await consensusTrigger.click();
    }
    const consensusPage = new StackConsensusPage(page);
    await expect(consensusPage.consensusHeader).toBeVisible();
    await consensusPage.voteApprove();
    
    // 6. GENERATE AI TASK SPLITTER
    await page.goto('/workspace/proj_1');
    const splitterPage = new TaskSplitterPage(page);
    await splitterPage.selectTab();
    await expect(splitterPage.taskPlanHeader).toBeVisible();

    // 7. OPEN COMMAND CENTER
    const commandPage = new CommandCenterPage(page);
    await commandPage.selectTab();
    await expect(commandPage.projectHealthText).toBeVisible();

    // 8. CONNECT GITHUB (Verify integration overview layout)
    const githubTabBtn = page.locator('button:has-text("GitHub")');
    await githubTabBtn.click();
    const gitHubPage = new GitHubPage(page);
    await expect(gitHubPage.commitsTab).toBeVisible();

    // 9. REPOSITORY INTELLIGENCE & REALITY CHECK
    await gitHubPage.aiAnalysisTab.click();
    await expect(page.locator('div:has-text("AI Repository Analysis")')).toBeVisible();
    
    await gitHubPage.realityCheckTab.click();
    await expect(page.locator('div:has-text("Project Reality Check")')).toBeVisible();

    // 10. AI MENTOR CHAT
    const chatPage = new MentorChatPage(page);
    await chatPage.selectTab();
    await chatPage.sendMessage('How do we solve mock tokens?');
    await expect(chatPage.userBubble.last()).toContainText('How do we solve mock tokens?');

    // 11. LOGOUT
    await page.goto('/dashboard');
    await authPage.logout();
    await expect(page).toHaveURL(/\/login/);
  });
});
