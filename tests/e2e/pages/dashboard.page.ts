// Nachbar.io — Page Object: Dashboard (Home Feed)
import { Page, Locator, expect } from "@playwright/test";
import { TIMEOUTS } from "../helpers/test-config";
import { waitForStableUI } from "../helpers/observer";

export class DashboardPage {
  readonly page: Page;
  readonly greeting: Locator;
  readonly notificationBell: Locator;
  readonly unreadBadge: Locator;
  readonly alertSection: Locator;
  readonly helpSection: Locator;
  readonly newsSection: Locator;
  readonly marketplaceSection: Locator;
  readonly bottomNav: Locator;
  readonly profileBanner: Locator;

  constructor(page: Page) {
    this.page = page;
    this.greeting = page.locator("[data-testid='dashboard-greeting']");
    this.notificationBell = page.locator("[data-testid='notification-bell']");
    this.unreadBadge = page.locator("[data-testid='unread-badge']");
    this.alertSection = page.locator("[data-testid='alert-section']");
    this.helpSection = page.locator("[data-testid='help-section']");
    this.newsSection = page.locator("[data-testid='news-section']");
    this.marketplaceSection = page.locator("[data-testid='marketplace-section']");
    this.bottomNav = page.locator('nav[aria-label="Hauptnavigation"]');
    this.profileBanner = page.locator("[data-testid='profile-completion-banner']");
  }

  async goto() {
    await this.page.goto("/dashboard");
    await waitForStableUI(this.page);
  }

  async assertLoaded() {
    // Dashboard ist geladen, wenn BottomNav sichtbar ist
    await expect(this.bottomNav).toBeVisible({ timeout: TIMEOUTS.pageLoad });
    await expect(this.page).toHaveURL(/\/dashboard/);
  }

  async navigateVia(section: "home" | "map" | "help" | "care" | "inbox" | "profile") {
    const labels: Record<string, string> = {
      home: "Start",
      map: "Quartier",
      help: "Quartier",
      care: "Gesundheit",
      inbox: "Inbox",
      profile: "Ich",
    };
    await this.bottomNav.getByText(labels[section]).click();
    await waitForStableUI(this.page);
  }

  async getAlertCount(): Promise<number> {
    return this.page.locator("[data-testid='alert-card']").count();
  }

  async getHelpRequestCount(): Promise<number> {
    return this.page.locator("[data-testid='help-card']").count();
  }

  async clickCreateHelp() {
    await this.page.locator("[data-testid='create-help-button']").click();
    await this.page.waitForURL("**/help/new**", { timeout: TIMEOUTS.pageLoad });
  }
}
