// Nachbar.io — Page Object: Registrierungs-Seite (4 Schritte)
import { Page, Locator, expect } from "@playwright/test";
import { TIMEOUTS } from "../helpers/test-config";
import { waitForStableUI } from "../helpers/observer";

export class RegisterPage {
  readonly page: Page;

  // Schritt 1: Credentials
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly nextButton: Locator;

  // Schritt 2: Invite-Code
  readonly inviteCodeInput: Locator;
  readonly checkCodeButton: Locator;
  readonly backButton: Locator;

  // Schritt 3: Profil
  readonly displayNameInput: Locator;
  readonly profileNextButton: Locator;

  // Schritt 4: Modus
  readonly activeModeButton: Locator;
  readonly seniorModeButton: Locator;
  readonly completeButton: Locator;

  // Allgemein
  readonly stepIndicator: Locator;
  readonly errorMessage: Locator;
  readonly loginLink: Locator;

  constructor(page: Page) {
    this.page = page;

    // Schritt 1
    this.emailInput = page.getByLabel("E-Mail-Adresse");
    this.passwordInput = page.getByLabel("Passwort");
    this.nextButton = page.getByRole("button", { name: "Weiter" });

    // Schritt 2
    this.inviteCodeInput = page.getByLabel("Einladungscode");
    this.checkCodeButton = page.getByRole("button", { name: "Code prüfen" });
    this.backButton = page.getByText("Zurück");

    // Schritt 3
    this.displayNameInput = page.getByLabel("Anzeigename");
    this.profileNextButton = page.getByRole("button", { name: "Weiter" });

    // Schritt 4
    this.activeModeButton = page.getByText("Aktiver Modus");
    this.seniorModeButton = page.getByText("Einfacher Modus");
    this.completeButton = page.getByRole("button", { name: "Registrierung abschließen" });

    // Allgemein
    this.stepIndicator = page.locator("text=/Schritt \\d+ von 4/");
    this.errorMessage = page.locator(".text-emergency-red");
    this.loginLink = page.getByRole("link", { name: "Jetzt anmelden" });
  }

  async goto() {
    await this.page.goto("/register");
    await this.page.getByText("Registrieren").waitFor({ state: "visible", timeout: TIMEOUTS.pageLoad });
  }

  async assertOnStep(step: number) {
    await expect(this.page.getByText(`Schritt ${step} von 4`)).toBeVisible({
      timeout: TIMEOUTS.elementVisible,
    });
  }

  // Schritt 1: Credentials eingeben
  async fillCredentials(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.nextButton.click();
  }

  // Schritt 2: Invite-Code eingeben
  async fillInviteCode(code: string) {
    await this.inviteCodeInput.waitFor({ state: "visible", timeout: TIMEOUTS.elementVisible });
    await this.inviteCodeInput.fill(code);
    await this.checkCodeButton.click();
  }

  // Schritt 3: Profil-Name eingeben
  async fillDisplayName(name: string) {
    await this.displayNameInput.waitFor({ state: "visible", timeout: TIMEOUTS.elementVisible });
    await this.displayNameInput.fill(name);
    await this.profileNextButton.click();
  }

  // Schritt 4: Modus waehlen und abschliessen
  async selectModeAndComplete(mode: "active" | "senior") {
    await this.activeModeButton.waitFor({ state: "visible", timeout: TIMEOUTS.elementVisible });

    if (mode === "senior") {
      await this.seniorModeButton.click();
    } else {
      await this.activeModeButton.click();
    }

    await this.completeButton.click();
  }

  // Kompletter Registrierungsfluss
  async registerFull(options: {
    email: string;
    password: string;
    inviteCode: string;
    displayName: string;
    mode: "active" | "senior";
  }) {
    await this.fillCredentials(options.email, options.password);
    await this.fillInviteCode(options.inviteCode);
    await this.fillDisplayName(options.displayName);
    await this.selectModeAndComplete(options.mode);

    // Auf Weiterleitung warten
    if (options.mode === "senior") {
      await this.page.waitForURL("**/senior/**", { timeout: TIMEOUTS.pageLoad });
    } else {
      await this.page.waitForURL("**/welcome**", { timeout: TIMEOUTS.pageLoad });
    }

    await waitForStableUI(this.page);
  }

  async assertInviteCodeError() {
    await expect(this.errorMessage).toBeVisible({ timeout: TIMEOUTS.elementVisible });
    await expect(this.errorMessage).toContainText(/ungültig|Einladungscode/i);
  }
}
