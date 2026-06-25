export class ProjectPage {
  constructor(page) {
    this.page = page;
    
    // Selectors for Project creation inside ProjectHub
    this.projectNameInput = page.locator('input[placeholder*="Project Name"]');
    this.problemStatementInput = page.locator('textarea[placeholder*="Problem Statement"]');
    this.descriptionInput = page.locator('textarea[placeholder*="Description"]');
    this.trackInput = page.locator('input[placeholder*="e.g. AI/ML"]');
    this.durationInput = page.locator('input[placeholder*="e.g. 36h"]');
    this.submitBtn = page.locator('button[type="submit"]');
    
    // Project listing and switching selectors
    this.projectHeader = page.locator('h3:has-text("HackVerse Copilot")');
    this.projectWorkspaceLink = page.locator('button:has-text("Workspace")');
  }

  async createProject(name, problem, desc, track, duration) {
    // Fill creation form
    await this.projectNameInput.fill(name);
    await this.problemStatementInput.fill(problem);
    await this.descriptionInput.fill(desc);
    await this.trackInput.fill(track);
    await this.durationInput.fill(duration);
    await this.submitBtn.click();
  }

  async openWorkspace() {
    await this.projectWorkspaceLink.click();
  }
}
