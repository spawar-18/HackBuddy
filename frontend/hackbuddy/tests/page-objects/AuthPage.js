export class AuthPage {
  constructor(page) {
    this.page = page;
    this.emailInput = page.locator('#email');
    this.passwordInput = page.locator('#password');
    this.submitButton = page.locator('button[type="submit"]');
    this.nameInput = page.locator('#name');
    this.agreeCheckbox = page.locator('#agreed');
    this.logoutButton = page.locator('.menu-item:has-text("Log Out")');
    this.errorAlert = page.locator('.error-alert');
  }

  async gotoLogin() {
    await this.page.goto('/login');
  }

  async gotoRegister() {
    await this.page.goto('/register');
  }

  async login(email, password) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  async register(name, email, password) {
    await this.nameInput.fill(name);
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.agreeCheckbox.check();
    await this.submitButton.click();
  }

  async logout() {
    await this.logoutButton.click();
  }
}
