// Nachbar.io — Page Object: Login-Seite (v3: Magic Link + Passkey + Apple)
// Passwort-Login ist im Pilot ausgeblendet (PILOT_HIDE_PASSWORD_LOGIN = true)
import { Page, Locator, expect } from "@playwright/test";
import { TIMEOUTS } from "../helpers/test-config";
import { waitForStableUI } from "../helpers/observer";

export class LoginPage {
  readonly page: Page;

  // Magic Link Modus (Standard)
  readonly emailInput: Locator;
  readonly sendMagicLinkButton: Locator;
  readonly switchToPasswordLink: Locator;

  // Passkey / Biometrische Anmeldung
  readonly passkeyButton: Locator;

  // Apple Sign-In
  readonly appleButton: Locator;

  // Passwort Modus (Fallback — im Pilot ausgeblendet)
  readonly passwordEmailInput: Locator;
  readonly passwordInput: Locator;
  readonly passwordSubmitButton: Locator;
  readonly switchToMagicLinkLink: Locator;

  // OTP-Code-Eingabe (nach Magic Link gesendet)
  readonly otpHeading: Locator;
  readonly otpCodeResendButton: Locator;
  readonly otpSubmitButton: Locator;

  // Allgemein
  readonly errorMessage: Locator;
  readonly registerLink: Locator;
  readonly heading: Locator;

  constructor(page: Page) {
    this.page = page;

    // Magic Link
    this.emailInput = page.getByLabel("E-Mail-Adresse").first();
    this.sendMagicLinkButton = page.getByRole("button", {
      name: "Anmelde-Code senden",
    });
    this.switchToPasswordLink = page.getByText(
      "Stattdessen mit Passwort anmelden",
    );

    // Passkey
    this.passkeyButton = page.getByRole("button", {
      name: "Mit Fingerabdruck / Gesicht anmelden",
    });

    // Apple
    this.appleButton = page.getByRole("button", {
      name: "Mit Apple anmelden",
    });

    // Passwort (ausgeblendet im Pilot)
    this.passwordEmailInput = page.locator("#email-pw");
    this.passwordInput = page.getByLabel("Passwort");
    this.passwordSubmitButton = page.getByRole("button", { name: "Anmelden" });
    this.switchToMagicLinkLink = page.getByText(
      "Stattdessen Anmelde-Code per E-Mail erhalten",
    );

    // OTP-Code-Eingabe (ersetzt alte "Link gesendet!"-Seite)
    this.otpHeading = page.getByText("Code eingeben");
    this.otpCodeResendButton = page.getByRole("button", {
      name: /Code erneut senden/,
    });
    this.otpSubmitButton = page.getByRole("button", { name: "Anmelden" });

    // Allgemein
    this.errorMessage = page.locator('[role="alert"]');
    this.registerLink = page.getByRole("link", { name: "Jetzt registrieren" });
    this.heading = page.getByText("Anmelden", { exact: true }).first();
  }

  async goto() {
    await this.page.goto("/login");
    await this.heading.waitFor({
      state: "visible",
      timeout: TIMEOUTS.pageLoad,
    });
    // Auf React-Hydration warten (Event-Handler muessen angebunden sein)
    await this.page
      .waitForLoadState("networkidle", { timeout: TIMEOUTS.networkIdle })
      .catch(() => {});
  }

  // Magic Link senden (Standard-Login)
  async sendMagicLink(email: string) {
    await this.emailInput.fill(email);
    await this.sendMagicLinkButton.click();
  }

  // Bestaetigung pruefen, dass OTP-Code-Eingabe angezeigt wird
  async assertMagicLinkSent() {
    await expect(this.otpHeading).toBeVisible({
      timeout: TIMEOUTS.elementVisible,
    });
    await expect(this.otpCodeResendButton).toBeVisible();
  }

  // Zum Passwort-Modus wechseln (nur wenn PILOT_HIDE_PASSWORD_LOGIN = false)
  async switchToPasswordMode() {
    await this.switchToPasswordLink.click();
    await this.passwordInput.waitFor({
      state: "visible",
      timeout: TIMEOUTS.elementVisible,
    });
  }

  // Passwort-Login (Fallback — nur wenn PILOT_HIDE_PASSWORD_LOGIN = false)
  async loginWithPassword(email: string, password: string) {
    await this.switchToPasswordMode();
    await this.passwordEmailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.passwordSubmitButton.click();
  }

  // Passwort-Login + Redirect zum Dashboard abwarten
  async loginAndWaitForDashboard(email: string, password: string) {
    await this.loginWithPassword(email, password);
    await this.page.waitForURL("**/dashboard**", {
      timeout: TIMEOUTS.pageLoad,
    });
    await waitForStableUI(this.page);
  }

  // Passwort-Login + Redirect zum Senior-Home abwarten
  async loginAndWaitForSeniorHome(email: string, password: string) {
    await this.loginWithPassword(email, password);
    await this.page.waitForURL("**/senior/**", { timeout: TIMEOUTS.pageLoad });
    await waitForStableUI(this.page);
  }

  // Sichtbarkeit der Login-Seite pruefen (Magic-Link-Modus v3)
  async assertVisible() {
    await expect(this.heading).toBeVisible();
    await expect(this.emailInput).toBeVisible();
    await expect(this.sendMagicLinkButton).toBeVisible();
  }

  // Fehlermeldung pruefen
  async assertError(pattern: string | RegExp) {
    await expect(this.errorMessage).toBeVisible({
      timeout: TIMEOUTS.elementVisible,
    });
    if (typeof pattern === "string") {
      await expect(this.errorMessage).toContainText(pattern);
    } else {
      await expect(this.errorMessage).toHaveText(pattern);
    }
  }
}
