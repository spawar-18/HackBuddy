export class DashboardPage {
  constructor(page) {
    this.page = page;
    this.greetingHeading = page.locator('h2:has-text("Good Evening")');
    this.profileCard = page.locator('.dashboard-card:has-text("Sahil Ojha")');
    this.notificationBell = page.locator('button:has(.text-neutral-500)');
    this.notificationsPanel = page.locator('div:has-text("Notifications Feed")');
    this.openAiAssistantBtn = page.locator('button:has-text("Open AI Assistant")');
    this.projectCard = page.locator('.dashboard-card:has-text("HackVerse Copilot")');
    this.circularProgress = page.locator('svg circle');
    this.quickActionButton = page.locator('button:has-text("Quick AI Review")');
    
    // Project switching selectors
    this.projectSelector = page.locator('select');
  }

  async goto() {
    await this.page.goto('/dashboard');
  }

  async selectProject(projectName) {
    await this.projectSelector.selectOption({ label: projectName });
  }

  async openNotifications() {
    await this.notificationBell.click();
  }

  async triggerQuickAIReview() {
    await this.quickActionButton.first().click();
  }
}
