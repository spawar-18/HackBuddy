export class TaskSplitterPage {
  constructor(page) {
    this.page = page;
    this.tabButton = page.locator('button:has-text("AI Task Splitter")');
    this.generateBtn = page.locator('button:has-text("Generate Task Plan")');
    this.regenerateBtn = page.locator('button:has-text("Regenerate Task Plan")');
    this.taskPlanHeader = page.locator('h3:has-text("AI Task Allocation Plan")');
    
    // Task allocation items
    this.assignmentGroup = page.locator('.border-brand-200\\/20, .divide-y');
    this.taskItem = page.locator('div:has-text("Setup Playwright infrastructure")');
  }

  async selectTab() {
    await this.tabButton.click();
  }

  async triggerGeneration() {
    if (await this.generateBtn.isVisible()) {
      await this.generateBtn.click();
    } else {
      await this.regenerateBtn.click();
    }
  }
}
