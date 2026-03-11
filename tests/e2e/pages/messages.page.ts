// Nachbar.io — Page Object: Nachrichten / Chat
import { Page, Locator, expect } from "@playwright/test";
import { TIMEOUTS } from "../helpers/test-config";
import { waitForStableUI } from "../helpers/observer";

export class MessagesPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly conversationList: Locator;
  readonly conversationCards: Locator;
  readonly pendingRequests: Locator;
  readonly emptyState: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByText("Nachrichten").first();
    this.conversationList = page.locator("[data-testid='conversation-list']");
    this.conversationCards = page.locator("[data-testid='conversation-card']");
    this.pendingRequests = page.locator("[data-testid='pending-requests']");
    this.emptyState = page.locator("[data-testid='messages-empty']");
  }

  async goto() {
    await this.page.goto("/messages");
    await waitForStableUI(this.page);
  }

  async getConversationCount(): Promise<number> {
    return this.conversationCards.count();
  }

  async openConversationByName(name: string) {
    await this.conversationCards.filter({ hasText: name }).first().click();
    await this.page.waitForURL("**/messages/**", { timeout: TIMEOUTS.pageLoad });
    await waitForStableUI(this.page);
  }

  async getUnreadCountForConversation(name: string): Promise<number> {
    const card = this.conversationCards.filter({ hasText: name }).first();
    const badge = card.locator("[data-testid='unread-count']");
    if (!(await badge.isVisible().catch(() => false))) return 0;
    const text = await badge.textContent();
    return parseInt(text || "0", 10);
  }
}

export class ChatPage {
  readonly page: Page;
  readonly messageInput: Locator;
  readonly sendButton: Locator;
  readonly messages: Locator;
  readonly partnerName: Locator;
  readonly backButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.messageInput = page.locator("[data-testid='chat-input']").or(
      page.getByPlaceholder(/nachricht|schreiben/i)
    );
    this.sendButton = page.locator("[data-testid='chat-send']").or(
      page.getByRole("button", { name: /senden/i })
    );
    this.messages = page.locator("[data-testid='chat-message']");
    this.partnerName = page.locator("[data-testid='chat-partner-name']");
    this.backButton = page.locator("[data-testid='chat-back']");
  }

  async sendMessage(text: string) {
    await this.messageInput.fill(text);
    // Enter zum Senden oder Button klicken
    await this.messageInput.press("Enter");
    await waitForStableUI(this.page);
  }

  async getMessageCount(): Promise<number> {
    return this.messages.count();
  }

  async getLastMessageText(): Promise<string> {
    const last = this.messages.last();
    return (await last.textContent()) || "";
  }

  async assertMessageVisible(text: string | RegExp) {
    await expect(
      this.messages.filter({ hasText: text })
    ).toBeVisible({ timeout: TIMEOUTS.realtimeDelivery });
  }

  async assertReadReceipt() {
    // "Gelesen" Indikator pruefen
    await expect(
      this.page.locator("[data-testid='read-receipt']").or(
        this.page.getByText("Gelesen")
      )
    ).toBeVisible({ timeout: TIMEOUTS.realtimeDelivery });
  }
}
