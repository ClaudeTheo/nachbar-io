// Nachbar.io — Page Object: Admin / Moderator Dashboard
import { Page, Locator, expect } from "@playwright/test";
import { TIMEOUTS } from "../helpers/test-config";
import { waitForStableUI } from "../helpers/observer";

export class AdminPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly tabs: Locator;
  readonly userTab: Locator;
  readonly contentTab: Locator;
  readonly systemTab: Locator;
  readonly statsCards: Locator;
  readonly userTable: Locator;
  readonly moderationQueue: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByText("Admin-Dashboard").first();
    this.tabs = page.locator("[data-testid='admin-tabs']");
    this.userTab = page.getByRole("tab", { name: /Nutzer|Users/i });
    this.contentTab = page.getByRole("tab", { name: /Inhalte|Content/i });
    this.systemTab = page.getByRole("tab", { name: /System/i });
    this.statsCards = page.locator("[data-testid='stats-card']");
    this.userTable = page.locator("[data-testid='user-table']");
    this.moderationQueue = page.locator("[data-testid='moderation-queue']");
  }

  async goto() {
    await this.page.goto("/admin");
    await waitForStableUI(this.page);
  }

  async assertLoaded() {
    await expect(this.page).toHaveURL(/\/admin/);
    // Admin-Seite sollte Stats anzeigen
    await waitForStableUI(this.page);
  }

  async switchToTab(tabName: string) {
    await this.page.getByRole("tab", { name: new RegExp(tabName, "i") }).click();
    await waitForStableUI(this.page);
  }

  async moderatePost(postTitle: string, action: "approve" | "reject" | "hide") {
    const postItem = this.page.locator("[data-testid='moderation-item']", { hasText: postTitle });
    await postItem.waitFor({ state: "visible", timeout: TIMEOUTS.elementVisible });

    const actionButton = postItem.locator(
      `[data-testid='moderation-${action}']`
    ).or(
      postItem.getByRole("button", { name: new RegExp(action, "i") })
    );
    await actionButton.click();
    await waitForStableUI(this.page);
  }

  async getUserCount(): Promise<number> {
    return this.page.locator("[data-testid='user-row']").count();
  }

  async searchUser(query: string) {
    const searchInput = this.page.locator("[data-testid='user-search']").or(
      this.page.getByPlaceholder(/suchen|search/i)
    );
    await searchInput.fill(query);
    await waitForStableUI(this.page);
  }
}
