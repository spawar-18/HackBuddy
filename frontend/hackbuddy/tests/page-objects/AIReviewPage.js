export class AIReviewPage {
  constructor(page) {
    this.page = page;
    this.tabButton = page.locator('button:has-text("AI Feasibility")');
    this.reviewHeader = page.locator('h3:has-text("AI Project Feasibility Review")');
    this.feasibilityScore = page.locator('.feasibility-score-val, text=/\\d+\\.\\d+/');
    this.regenerateBtn = page.locator('button:has-text("Regenerate Review")');
    this.generateBtn = page.locator('button:has-text("Generate Review")');
    
    // Identified risks and suggestions container/elements
    this.risksHeader = page.locator('div:has-text("Identified Feasibility Risks")');
    this.suggestionsHeader = page.locator('div:has-text("AI Recommendations")');
    this.riskItems = page.locator('li:has(.text-red-500), .flex:has-text("Risk")');
  }

  async selectTab() {
    await this.tabButton.click();
  }

  async triggerAnalysis() {
    if (await this.generateBtn.isVisible()) {
      await this.generateBtn.click();
    } else {
      await this.regenerateBtn.click();
    }
  }
}
