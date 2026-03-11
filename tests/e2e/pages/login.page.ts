// Nachbar.io — Page Object: Login-Seite
import { Page, Locator, expect } from "@playwright/test";
import { TIMEOUTS } from "../helpers/test-config";
import { waitForStableUI } from "../helpers/observer";

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;
  readonly registerLink: Locator;
  readonly heading: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByLabel("E-Mail-Adresse");
    this.passwordInput = page.getByLabel("Passwort");
    this.submitButton = page.getByRole("button", { name: "Anmelden" });
    this.errorMessage = page.locator('[role="alert"]');
    this.registerLink = page.getByRole("link", { name: "Jetzt registrieren" });
    this.heading = page.getByText("Anmelden", { exact: true }).first();
  }

  async goto() {
    await this.page.goto("/login");
    await this.heading.waitFor({ state: "visible", timeout: TIMEOUTS.pageLoad });
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  async loginAndWaitForDashboard(email: string, password: string) {
    await this.login(email, password);
    await this.page.waitForURL("**/dashboard**", { timeout: TIMEOUTS.pageLoad });
    await waitForStableUI(this.page);
  }

  async loginAndWaitForSeniorHome(email: string, password: string) {
    await this.login(email, password);
    await this.page.waitForURL("**/senior/**", { timeout: TIMEOUTS.pageLoad });
    await waitForStableUI(this.page);
  }

  async assertVisible() {
    await expect(this.heading).toBeVisible();
    await expect(this.emailInput).toBeVisible();
    await expect(this.passwordInput).toBeVisible();
    await expect(this.submitButton).toBeVisible();
  }

  async assertError(pattern: string | RegExp) {
    await expect(this.errorMessage).toBeVisible({ timeout: TIMEOUTS.elementVisible });
    if (typeof pattern === "string") {
      await expect(this.errorMessage).toContainText(pattern);
    } else {
      await expect(this.errorMessage).toHaveText(pattern);
    }
  }
}
