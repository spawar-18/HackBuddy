export class MentorChatPage {
  constructor(page) {
    this.page = page;
    this.tabButton = page.locator('button:has-text("AI Mentor Chat")');
    this.chatInput = page.locator('input[placeholder*="Ask Copilot"]');
    this.sendButton = page.locator('button:has(svg)'); // Button with the send/arrow icon
    this.messagesContainer = page.locator('.chat-messages, .flex-col');
    this.assistantBubble = page.locator('.assistant-bubble, .bg-neutral-900\\/90');
    this.userBubble = page.locator('.user-bubble, .bg-brand-500');
  }

  async selectTab() {
    await this.tabButton.click();
  }

  async sendMessage(msg) {
    await this.chatInput.fill(msg);
    await this.sendButton.click();
  }
}
