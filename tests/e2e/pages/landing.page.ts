// Nachbar.io — Page Object: Landing Page (Root /)
import { Page, Locator, expect } from "@playwright/test";
import { TIMEOUTS } from "../helpers/test-config";

export class LandingPage {
  readonly page: Page;
  readonly logo: Locator;
  readonly loginButton: Locator;
  readonly registerButton: Locator;
  readonly datenschutzLink: Locator;
  readonly impressumLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.logo = page.locator("[data-testid='landing-logo']").or(page.getByText("Nachbar.io").first());
    this.loginButton = page.getByRole("link", { name: /anmelden|login/i }).first();
    this.registerButton = page.getByRole("link", { name: /registrieren|register/i }).first();
    this.datenschutzLink = page.getByRole("link", { name: /datenschutz/i });
    this.impressumLink = page.getByRole("link", { name: /impressum/i });
  }

  async goto() {
    await this.page.goto("/");
    await this.page.waitForLoadState("domcontentloaded", { timeout: TIMEOUTS.pageLoad });
  }

  async assertLoaded() {
    // Root-Seite laed — entweder Landing oder Redirect zu Login
    const url = this.page.url();
    expect(url).toMatch(/\/(login)?$/);
  }

  async navigateToLogin() {
    if (this.page.url().includes("/login")) return; // Bereits auf Login
    await this.loginButton.click();
    await this.page.waitForURL("**/login**", { timeout: TIMEOUTS.pageLoad });
  }

  async navigateToRegister() {
    await this.registerButton.click();
    await this.page.waitForURL("**/register**", { timeout: TIMEOUTS.pageLoad });
  }
}
