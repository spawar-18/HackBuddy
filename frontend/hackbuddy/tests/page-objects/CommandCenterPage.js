export class CommandCenterPage {
  constructor(page) {
    this.page = page;
    this.tabButton = page.locator('button:has-text("Command Center")');
    this.countdownTimer = page.locator('.font-mono:has-text(":")'); // Timer text e.g. 35:59:59
    this.projectHealthText = page.locator('text=/Project Health|HEALTH:/i');
    this.winningProbabilityText = page.locator('text=/Winning Probability|Win:/i');
    
    // Reality check items
    this.realityCheckHeader = page.locator('div:has-text("Reality Check Alert")');
    this.alertBox = page.locator('div:has-text("unconnected")');
  }

  async selectTab() {
    await this.tabButton.click();
  }
}
