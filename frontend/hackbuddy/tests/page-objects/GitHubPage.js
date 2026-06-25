export class GitHubPage {
  constructor(page) {
    this.page = page;
    
    // Connect Form elements
    this.ownerInput = page.locator('input[placeholder*="octocat"]');
    this.repoInput = page.locator('input[placeholder*="my-hackathon-project"]');
    this.connectBtn = page.locator('#github-connect-btn');
    
    // Operations buttons
    this.syncBtn = page.locator('#github-sync-btn');
    this.disconnectBtn = page.locator('button:has-text("Disconnect")');
    this.aiAnalyzeBtn = page.locator('#github-ai-analyze-btn');
    
    // Tabs buttons
    this.overviewTab = page.locator('button:has-text("Overview")');
    this.commitsTab = page.locator('button:has-text("Commits")');
    this.contributorsTab = page.locator('button:has-text("Contributors")');
    this.aiAnalysisTab = page.locator('button:has-text("AI Analysis")');
    this.realityCheckTab = page.locator('button:has-text("Reality Check")');
    
    // Elements lists
    this.commitItems = page.locator('.divide-y div');
    this.prItems = page.locator('a[href*="/pull/"]');
    this.issueItems = page.locator('a[href*="/issues/"]');
  }

  async connectRepository(owner, repo) {
    await this.ownerInput.fill(owner);
    await this.repoInput.fill(repo);
    await this.connectBtn.click();
  }

  async syncRepository() {
    await this.syncBtn.click();
  }

  async disconnectRepository() {
    await this.disconnectBtn.click();
  }

  async runAIAnalysis() {
    await this.aiAnalyzeBtn.click();
  }
}
