// Nachbar.io — Page Object: Login-Seite (Magic Link Standard + Passwort Fallback)
import { Page, Locator, expect } from "@playwright/test";
import { TIMEOUTS } from "../helpers/test-config";
import { waitForStableUI } from "../helpers/observer";

export class LoginPage {
  readonly page: Page;

  // Magic Link Modus (Standard)
  readonly emailInput: Locator;
  readonly sendMagicLinkButton: Locator;
  readonly switchToPasswordLink: Locator;

  // Passwort Modus (Fallback)
  readonly passwordEmailInput: Locator;
  readonly passwordInput: Locator;
  readonly passwordSubmitButton: Locator;
  readonly switchToMagicLinkLink: Locator;

  // Bestaetigung
  readonly magicLinkSentHeading: Locator;
  readonly retryButton: Locator;

  // Allgemein
  readonly errorMessage: Locator;
  readonly registerLink: Locator;
  readonly heading: Locator;

  constructor(page: Page) {
    this.page = page;

    // Magic Link
    this.emailInput = page.getByLabel("E-Mail-Adresse").first();
    this.sendMagicLinkButton = page.getByRole("button", { name: "Anmeldelink senden" });
    this.switchToPasswordLink = page.getByText("Stattdessen mit Passwort anmelden");

    // Passwort
    this.passwordEmailInput = page.locator("#email-pw");
    this.passwordInput = page.getByLabel("Passwort");
    this.passwordSubmitButton = page.getByRole("button", { name: "Anmelden" });
    this.switchToMagicLinkLink = page.getByText("Stattdessen Anmeldelink per E-Mail erhalten");

    // Bestaetigung
    this.magicLinkSentHeading = page.getByText("Link gesendet!");
    this.retryButton = page.getByRole("button", { name: "Erneut versuchen" });

    // Allgemein
    this.errorMessage = page.locator('[role="alert"]');
    this.registerLink = page.getByRole("link", { name: "Jetzt registrieren" });
    this.heading = page.getByText("Anmelden", { exact: true }).first();
  }

  async goto() {
    await this.page.goto("/login");
    await this.heading.waitFor({ state: "visible", timeout: TIMEOUTS.pageLoad });
  }

  // Magic Link senden (Standard-Login)
  async sendMagicLink(email: string) {
    await this.emailInput.fill(email);
    await this.sendMagicLinkButton.click();
  }

  // Bestaetigung pruefen, dass Magic Link gesendet wurde
  async assertMagicLinkSent() {
    await expect(this.magicLinkSentHeading).toBeVisible({
      timeout: TIMEOUTS.elementVisible,
    });
  }

  // Zum Passwort-Modus wechseln
  async switchToPasswordMode() {
    await this.switchToPasswordLink.click();
    await this.passwordInput.waitFor({ state: "visible", timeout: TIMEOUTS.elementVisible });
  }

  // Passwort-Login (Fallback)
  async loginWithPassword(email: string, password: string) {
    await this.switchToPasswordMode();
    await this.passwordEmailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.passwordSubmitButton.click();
  }

  // Passwort-Login + Redirect zum Dashboard abwarten
  async loginAndWaitForDashboard(email: string, password: string) {
    await this.loginWithPassword(email, password);
    await this.page.waitForURL("**/dashboard**", { timeout: TIMEOUTS.pageLoad });
    await waitForStableUI(this.page);
  }

  // Passwort-Login + Redirect zum Senior-Home abwarten
  async loginAndWaitForSeniorHome(email: string, password: string) {
    await this.loginWithPassword(email, password);
    await this.page.waitForURL("**/senior/**", { timeout: TIMEOUTS.pageLoad });
    await waitForStableUI(this.page);
  }

  // Sichtbarkeit der Login-Seite pruefen (Magic-Link-Modus)
  async assertVisible() {
    await expect(this.heading).toBeVisible();
    await expect(this.emailInput).toBeVisible();
    await expect(this.sendMagicLinkButton).toBeVisible();
  }

  // Fehlermeldung pruefen
  async assertError(pattern: string | RegExp) {
    await expect(this.errorMessage).toBeVisible({ timeout: TIMEOUTS.elementVisible });
    if (typeof pattern === "string") {
      await expect(this.errorMessage).toContainText(pattern);
    } else {
      await expect(this.errorMessage).toHaveText(pattern);
    }
  }
}
