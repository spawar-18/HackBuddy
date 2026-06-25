export class StackConsensusPage {
  constructor(page) {
    this.page = page;
    
    // Selectors inside TechStackConsensus
    this.consensusHeader = page.locator('h2:has-text("AI Tech Stack Consensus Engine")');
    this.proposeButton = page.locator('button:has-text("Propose Stack")');
    this.voteApproveButton = page.locator('button:has-text("Approve Stack"), button:has-text("VOTE APPROVE")');
    this.voteRejectButton = page.locator('button:has-text("Object Stack"), button:has-text("VOTE DISAGREE")');
    
    // Squad Leader actions
    this.approveFinalStackBtn = page.locator('button:has-text("Lock & Approve Stack"), button:has-text("Lock Stack")');
    this.restartConsensusBtn = page.locator('button:has-text("Restart Consensus Voting")');
    this.consensusScore = page.locator('div:has-text("Consensus Score")');
  }

  async voteApprove() {
    await this.voteApproveButton.click();
  }

  async voteReject() {
    await this.voteRejectButton.click();
  }

  async finalizeConsensus() {
    await this.approveFinalStackBtn.click();
  }
}
