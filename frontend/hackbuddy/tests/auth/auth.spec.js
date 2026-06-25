import { test, expect } from '@playwright/test';
import { AuthPage } from '../page-objects/AuthPage.js';
import { setupRouteMocks } from '../helpers/routeMock.js';

test.describe('Authentication Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Register all API route intercepts
    await setupRouteMocks(page);
  });

  test('User can Login successfully', async ({ page }) => {
    const authPage = new AuthPage(page);
    await authPage.gotoLogin();

    // Perform login action
    await authPage.login('sahil@vibecoders.com', 'password123');

    // Should redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard/);
    
    // Greeting heading should show Sahil
    const greeting = page.locator('h2:has-text("Good Evening, Sahil Ojha.")');
    await expect(greeting).toBeVisible();
  });

  test('User can Register successfully', async ({ page }) => {
    const authPage = new AuthPage(page);
    await authPage.gotoRegister();

    // Perform registration
    await authPage.register('Sahil Ojha', 'sahil@vibecoders.com', 'password123');

    // Should redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('Unauthorized route protection redirects to login', async ({ page }) => {
    // Navigating directly to dashboard without session
    await page.goto('/dashboard');
    
    // Should be redirected back to login page
    await expect(page).toHaveURL(/\/login/);
  });

  test('User can Logout successfully', async ({ page }) => {
    const authPage = new AuthPage(page);
    await authPage.gotoLogin();
    await authPage.login('sahil@vibecoders.com', 'password123');

    // Perform logout
    await authPage.logout();

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
  });

  test('Session Persistence works across reloads', async ({ page }) => {
    const authPage = new AuthPage(page);
    await authPage.gotoLogin();
    await authPage.login('sahil@vibecoders.com', 'password123');
    
    // Reload page
    await page.reload();
    
    // Should still be on dashboard
    await expect(page).toHaveURL(/\/dashboard/);
  });
});
