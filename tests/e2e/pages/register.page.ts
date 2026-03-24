// Nachbar.io — Page Object: Registrierungs-Seite (2-Schritt Magic-Link-Flow)
// Flow: Entry → [Invite-Code ODER Adresse] → Identity (Name+Email) → Magic Link gesendet
import { Page, Locator, expect } from "@playwright/test";
import { TIMEOUTS } from "../helpers/test-config";

export class RegisterPage {
  readonly page: Page;

  // Schritt 1a: Entry — Zwei Pfade
  readonly inviteCodePathButton: Locator;
  readonly addressPathButton: Locator;

  // Schritt 1b: Invite-Code
  readonly inviteCodeInput: Locator;
  readonly checkCodeButton: Locator;

  // Schritt 1c: Adresse
  readonly addressSearchInput: Locator;
  readonly geoDetectButton: Locator;
  readonly addressNextButton: Locator;

  // Schritt 2: Identity (Name + E-Mail)
  readonly displayNameInput: Locator;
  readonly emailInput: Locator;
  readonly sendMagicLinkButton: Locator;

  // Bestaetigung: Magic Link gesendet
  readonly resendLinkButton: Locator;
  readonly confirmationIcon: Locator;

  // Allgemein
  readonly backButton: Locator;
  readonly errorMessage: Locator;
  readonly loginLink: Locator;
  readonly stepIndicator: Locator;

  constructor(page: Page) {
    this.page = page;

    // Entry-Pfade
    this.inviteCodePathButton = page.getByText("Ich habe einen Einladungscode");
    this.addressPathButton = page.getByText("Ich möchte mein Quartier finden");

    // Invite-Code
    this.inviteCodeInput = page.getByLabel("Einladungscode");
    this.checkCodeButton = page.getByRole("button", { name: "Code prüfen" });

    // Adresse
    this.addressSearchInput = page.getByPlaceholder(/Straße eingeben/i).or(
      page.getByLabel("Straße")
    );
    this.geoDetectButton = page.getByText("Standort automatisch erkennen");
    this.addressNextButton = page.getByRole("button", { name: "Weiter" });

    // Identity
    this.displayNameInput = page.getByLabel("Anzeigename");
    this.emailInput = page.getByLabel("E-Mail-Adresse");
    this.sendMagicLinkButton = page.getByRole("button", {
      name: "Anmelde-Code senden",
    });

    // Bestaetigung (OTP-Code-Eingabe)
    this.resendLinkButton = page.getByRole("button", {
      name: /Code erneut senden/,
    });
    this.confirmationIcon = page.locator(".bg-quartier-green\\/10");

    // Allgemein
    this.backButton = page.getByText("Zurück");
    this.errorMessage = page.locator(".text-emergency-red");
    this.loginLink = page.getByRole("link", { name: "Jetzt anmelden" });
    this.stepIndicator = page.locator("text=/Schritt \\d+ von 2/");
  }

  async goto() {
    await this.page.goto("/register");
    await this.page.getByText("Willkommen bei QuartierApp").waitFor({
      state: "visible",
      timeout: TIMEOUTS.pageLoad,
    });
    // Auf React-Hydration warten: Buttons muessen klickbare Event-Handler haben
    await this.page
      .waitForFunction(
        () =>
          document
            .querySelector("[data-reactroot], #__next")
            ?.querySelector("button") !== null,
        { timeout: TIMEOUTS.pageLoad },
      )
      .catch(() => {});
    // Sicherheitspause fuer Event-Handler-Anbindung
    await this.page
      .waitForLoadState("networkidle", { timeout: TIMEOUTS.networkIdle })
      .catch(() => {});
  }

  // Pruefen, auf welchem Schritt wir sind (1 oder 2)
  async assertOnStep(step: number) {
    await expect(this.page.getByText(`Schritt ${step} von 2`)).toBeVisible({
      timeout: TIMEOUTS.elementVisible,
    });
  }

  // Entry: Pfad "Einladungscode" waehlen
  async chooseInviteCodePath() {
    await this.inviteCodePathButton.click();
    await this.inviteCodeInput.waitFor({
      state: "visible",
      timeout: TIMEOUTS.elementVisible,
    });
  }

  // Entry: Pfad "Quartier finden" waehlen
  async chooseAddressPath() {
    await this.addressPathButton.click();
    await this.addressSearchInput.waitFor({
      state: "visible",
      timeout: TIMEOUTS.elementVisible,
    });
  }

  // Invite-Code eingeben und pruefen
  async fillInviteCode(code: string) {
    await this.inviteCodeInput.fill(code);
    await this.checkCodeButton.click();
  }

  // Identity: Name + E-Mail eingeben und Magic Link senden
  async fillIdentity(displayName: string, email: string) {
    await this.displayNameInput.waitFor({
      state: "visible",
      timeout: TIMEOUTS.elementVisible,
    });
    await this.displayNameInput.fill(displayName);
    await this.emailInput.fill(email);
    await this.sendMagicLinkButton.click();
  }

  // Pruefen, dass OTP-Code-Eingabe angezeigt wird (Magic-Link-Bestaetigung)
  async assertMagicLinkSent(email: string) {
    // OTP-Seite zeigt "Wir haben einen Code an ... gesendet"
    await expect(this.page.getByText("Wir haben einen Code an")).toBeVisible({
      timeout: TIMEOUTS.elementVisible,
    });
    await expect(this.page.getByText(email)).toBeVisible();
    await expect(this.resendLinkButton).toBeVisible();
  }

  // Kompletter Registrierungsfluss via Invite-Code bis Magic-Link-Bestaetigung
  async registerWithInviteCode(options: {
    inviteCode: string;
    displayName: string;
    email: string;
  }) {
    await this.chooseInviteCodePath();
    await this.fillInviteCode(options.inviteCode);
    await this.fillIdentity(options.displayName, options.email);
    await this.assertMagicLinkSent(options.email);
  }

  // Invite-Code Fehlermeldung pruefen
  async assertInviteCodeError() {
    await expect(this.errorMessage).toBeVisible({
      timeout: TIMEOUTS.elementVisible,
    });
    await expect(this.errorMessage).toContainText(/ungültig|Einladungscode/i);
  }

  // Allgemeine Fehlermeldung pruefen
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

  // Entry-Ansicht pruefen (beide Pfade sichtbar)
  async assertEntryVisible() {
    await expect(this.inviteCodePathButton).toBeVisible({
      timeout: TIMEOUTS.elementVisible,
    });
    await expect(this.addressPathButton).toBeVisible();
  }
}
