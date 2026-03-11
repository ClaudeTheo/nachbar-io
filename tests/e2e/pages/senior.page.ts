// Nachbar.io — Page Object: Senioren-Terminal
import { Page, Locator, expect } from "@playwright/test";
import { TIMEOUTS } from "../helpers/test-config";
import { waitForStableUI } from "../helpers/observer";

export class SeniorHomePage {
  readonly page: Page;
  readonly greeting: Locator;
  readonly helpButton: Locator;
  readonly newsButton: Locator;
  readonly checkinButton: Locator;
  readonly contactButton: Locator;
  readonly switchModeButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.greeting = page.locator("[data-testid='senior-greeting']").or(
      page.getByText(/Guten Tag|Guten Morgen|Guten Abend/i).first()
    );
    this.helpButton = page.locator("[data-testid='senior-help-button']").or(
      page.getByText("Hilfe anfragen")
    );
    this.newsButton = page.locator("[data-testid='senior-news-button']").or(
      page.getByText("Nachrichten")
    );
    this.checkinButton = page.locator("[data-testid='senior-checkin-button']").or(
      page.getByText("Alles in Ordnung")
    );
    this.contactButton = page.locator("[data-testid='senior-contact-button']").or(
      page.getByText("Nachbarn kontaktieren")
    );
    this.switchModeButton = page.getByText("Zum normalen Modus");
  }

  async goto() {
    await this.page.goto("/senior/home");
    await waitForStableUI(this.page);
  }

  async assertLoaded() {
    await expect(this.page).toHaveURL(/\/senior/);
    await expect(this.greeting).toBeVisible({ timeout: TIMEOUTS.pageLoad });
  }

  async assertAllButtonsVisible() {
    await expect(this.helpButton).toBeVisible();
    await expect(this.newsButton).toBeVisible();
    await expect(this.checkinButton).toBeVisible();
    await expect(this.contactButton).toBeVisible();
  }

  /** Prueft ob Buttons mindestens 80px hoch sind (Senior-Accessibility) */
  async assertTouchTargetSize() {
    const buttons = this.page.locator("[data-testid^='senior-'] button, .senior-button");
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
    await this.page.waitForURL("**/senior/help**", { timeout: TIMEOUTS.pageLoad });
  }

  async clickCheckin() {
    await this.checkinButton.click();
    await this.page.waitForURL("**/senior/checkin**", { timeout: TIMEOUTS.pageLoad });
  }

  async clickNews() {
    await this.newsButton.click();
    await this.page.waitForURL("**/senior/news**", { timeout: TIMEOUTS.pageLoad });
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
    this.okButton = page.locator("[data-testid='checkin-ok']").or(
      page.getByText(/Alles gut|In Ordnung/i)
    );
    this.notWellButton = page.locator("[data-testid='checkin-not-well']").or(
      page.getByText(/Nicht so gut/i)
    );
    this.needHelpButton = page.locator("[data-testid='checkin-need-help']").or(
      page.getByText(/Brauche Hilfe/i)
    );
    this.confirmMessage = page.locator("[data-testid='checkin-confirmed']");
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
