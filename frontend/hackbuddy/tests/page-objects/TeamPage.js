export class TeamPage {
  constructor(page) {
    this.page = page;
    this.teamNameInput = page.locator('input[placeholder="e.g. octocat"]');
    this.descriptionInput = page.locator('textarea');
    this.createTeamBtn = page.locator('button[type="submit"]');
    
    // Join Team elements
    this.inviteCodeInput = page.locator('input[placeholder="e.g. AB12CD"]');
    this.joinTeamBtn = page.locator('button[type="submit"]');
    
    // TeamDetails Page elements
    this.inviteCodeDisplay = page.locator('.code-val');
    this.removeMemberBtn = page.locator('button:has-text("Remove")');
    this.transferBtn = page.locator('button:has-text("Transfer")');
    this.deleteTeamBtn = page.locator('button:has-text("Delete Team")');
  }

  async gotoCreate() {
    await this.page.goto('/team/create');
  }

  async gotoJoin() {
    await this.page.goto('/team/join');
  }

  async createTeam(name, desc) {
    await this.teamNameInput.fill(name);
    await this.descriptionInput.fill(desc);
    await this.createTeamBtn.click();
  }

  async joinTeam(code) {
    await this.inviteCodeInput.fill(code);
    await this.joinTeamBtn.click();
  }
}
