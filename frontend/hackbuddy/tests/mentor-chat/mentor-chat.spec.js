import { test, expect } from '@playwright/test';
import { AuthPage } from '../page-objects/AuthPage.js';
import { MentorChatPage } from '../page-objects/MentorChatPage.js';
import { setupRouteMocks } from '../helpers/routeMock.js';

test.describe('AI Mentor Chat Tests', () => {
  test.beforeEach(async ({ page }) => {
    await setupRouteMocks(page);
    
    // Log in first
    const authPage = new AuthPage(page);
    await authPage.gotoLogin();
    await authPage.login('sahil@vibecoders.com', 'password123');
    
    // Navigate directly to project workspace
    await page.goto('/workspace/proj_1');
  });

  test('Mentor Chat opens and shows chat history', async ({ page }) => {
    const chatPage = new MentorChatPage(page);
    await chatPage.selectTab();

    // Verify messages list renders
    await expect(chatPage.assistantBubble.first()).toBeVisible();
    await expect(chatPage.assistantBubble.first()).toContainText('intercept incoming routes');
  });

  test('User can send a message and receive mentor responses', async ({ page }) => {
    const chatPage = new MentorChatPage(page);
    await chatPage.selectTab();

    // Send chat message
    await chatPage.sendMessage('Is Playwright running in parallel?');

    // User's query bubble should be rendered
    await expect(chatPage.userBubble.last()).toBeVisible();
    await expect(chatPage.userBubble.last()).toContainText('Is Playwright running in parallel?');

    // Assistant response bubble should be rendered
    await expect(chatPage.assistantBubble.last()).toBeVisible();
    await expect(chatPage.assistantBubble.last()).toContainText('fullyParallel');
  });
});
