// Nachbar.io — Page Object: Senioren-Terminal
import { Page, Locator, expect } from "@playwright/test";
import { TIMEOUTS } from "../helpers/test-config";
import { waitForStableUI } from "../helpers/observer";

export class SeniorHomePage {
  readonly page: Page;
  readonly greeting: Locator;
  readonly helpButton: Locator;
  readonly medicationsButton: Locator;
  readonly checkinButton: Locator;
  readonly sprechstundeButton: Locator;
  readonly switchModeButton: Locator;

  constructor(page: Page) {
    this.page = page;
    // Senior-Home hat keine Begruessung, sondern Uhrzeit/Datum
    this.greeting = page.locator("[data-testid='senior-greeting']").or(
      page.getByText(/Guten Tag|Guten Morgen|Guten Abend/i).first().or(
        // Fallback: Datum-Anzeige als Lebenszeichen der Seite
        page.locator(".text-4xl.font-bold").first()
      )
    );
    // 4 Haupt-Buttons auf der Senior-Startseite
    this.helpButton = page.getByText("Ich brauche Hilfe");
    this.medicationsButton = page.getByText("Medikamente");
    this.checkinButton = page.getByText("Mir geht es gut");
    this.sprechstundeButton = page.getByText("Sprechstunde");
    this.switchModeButton = page.getByText("Zum normalen Modus");
  }

  async goto() {
    // Route ist /senior (nicht /senior/home)
    await this.page.goto("/senior");
    await waitForStableUI(this.page);
  }

  async assertLoaded() {
    await expect(this.page).toHaveURL(/\/senior/);
    // Warte auf Uhrzeit-Anzeige als Indikator dass Seite geladen ist
    await expect(this.greeting).toBeVisible({ timeout: TIMEOUTS.pageLoad });
  }

  async assertAllButtonsVisible() {
    await expect(this.helpButton).toBeVisible();
    await expect(this.medicationsButton).toBeVisible();
    await expect(this.checkinButton).toBeVisible();
    await expect(this.sprechstundeButton).toBeVisible();
  }

  /** Prueft ob Buttons mindestens 80px hoch sind (Senior-Accessibility) */
  async assertTouchTargetSize() {
    const buttons = this.page.locator("button[style*='min-height'], a[style*='min-height']");
    const count = await buttons.count();

    for (let i = 0; i < count; i++) {
      const box = await buttons.nth(i).boundingBox();
      if (box) {
        expect(box.height).toBeGreaterThanOrEqual(76); // Toleranz 4px
      }
    }
  }

  async clickHelp() {
    await this.helpButton.click();
    await this.page.waitForURL("**/sos**", { timeout: TIMEOUTS.pageLoad });
  }

  async clickCheckin() {
    await this.checkinButton.click();
    await this.page.waitForURL("**/checkin**", { timeout: TIMEOUTS.pageLoad });
  }

  async clickMedications() {
    await this.medicationsButton.click();
    await this.page.waitForURL("**/medications**", { timeout: TIMEOUTS.pageLoad });
  }
}

export class SeniorCheckinPage {
  readonly page: Page;
  readonly okButton: Locator;
  readonly notWellButton: Locator;
  readonly needHelpButton: Locator;
  readonly confirmMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.okButton = page.getByText(/Mir geht es gut/i).first().or(
      page.locator("[data-testid='checkin-ok']")
    );
    this.notWellButton = page.getByText(/Nicht so gut/i).first().or(
      page.locator("[data-testid='checkin-not-well']")
    );
    this.needHelpButton = page.getByText(/Brauche Hilfe/i).first().or(
      page.locator("[data-testid='checkin-need-help']")
    );
    this.confirmMessage = page.locator("[data-testid='checkin-confirmed']").or(
      page.getByText(/Danke|bestätigt|erfolgreich/i)
    );
  }

  async goto() {
    await this.page.goto("/senior/checkin");
    await waitForStableUI(this.page);
  }

  async checkinOk() {
    await this.okButton.click();
    await waitForStableUI(this.page);
  }

  async assertCheckinConfirmed() {
    // Erfolgsbestaetigung oder Weiterleitung
    await expect(
      this.confirmMessage.or(this.page.getByText(/bestätigt|danke|erfolgreich/i))
    ).toBeVisible({ timeout: TIMEOUTS.elementVisible });
  }
}

export class SeniorHelpPage {
  readonly page: Page;
  readonly callButton: Locator;
  readonly sosButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.callButton = page.locator("[data-testid='senior-call']");
    this.sosButton = page.locator("[data-testid='senior-sos']").or(
      page.getByText(/SOS|Notruf|Notfall/i)
    );
  }

  async goto() {
    await this.page.goto("/senior/help");
    await waitForStableUI(this.page);
  }
}
