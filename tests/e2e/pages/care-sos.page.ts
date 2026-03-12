// Nachbar.io — Page Object: Care SOS Flow
import { Page, Locator, expect } from "@playwright/test";
import { TIMEOUTS } from "../helpers/test-config";
import { waitForStableUI } from "../helpers/observer";

export class CareSosNewPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly medicalEmergencyButton: Locator;
  readonly generalHelpButton: Locator;
  readonly visitWantedButton: Locator;
  readonly shoppingButton: Locator;
  readonly medicationHelpButton: Locator;
  readonly emergencyBanner: Locator;
  readonly emergencyCall112: Locator;
  readonly emergencyCall110: Locator;
  readonly emergencyAckButton: Locator;
  readonly emergencyNoCallButton: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByText("Was brauchen Sie?");
    this.medicalEmergencyButton = page.getByText("Medizinischer Notfall");
    this.generalHelpButton = page.getByText("Allgemeine Hilfe");
    this.visitWantedButton = page.getByText("Besuch gewuenscht");
    this.shoppingButton = page.getByText("Einkauf / Besorgung");
    this.medicationHelpButton = page.getByText("Medikamentenhilfe");
    this.emergencyBanner = page.locator("[role='alertdialog']").or(
      page.getByText("Notruf zuerst!")
    );
    this.emergencyCall112 = page.locator("a[href='tel:112']");
    this.emergencyCall110 = page.locator("a[href='tel:110']");
    this.emergencyAckButton = page.getByText(/Ich habe 112\/110 angerufen/i);
    this.emergencyNoCallButton = page.getByText(/Kein Notruf noetig/i);
    this.errorMessage = page.locator(".text-emergency-red");
  }

  async goto() {
    await this.page.goto("/care/sos/new");
    await waitForStableUI(this.page);
  }

  async assertLoaded() {
    await expect(this.heading).toBeVisible({ timeout: TIMEOUTS.pageLoad });
  }

  async assertAllCategoriesVisible() {
    await expect(this.medicalEmergencyButton).toBeVisible();
    await expect(this.generalHelpButton).toBeVisible();
    await expect(this.visitWantedButton).toBeVisible();
    await expect(this.shoppingButton).toBeVisible();
    await expect(this.medicationHelpButton).toBeVisible();
  }

  async selectMedicalEmergency() {
    await this.medicalEmergencyButton.click();
    await expect(this.emergencyBanner).toBeVisible({ timeout: TIMEOUTS.elementVisible });
  }

  async acknowledgeEmergency() {
    await this.emergencyAckButton.click();
    await waitForStableUI(this.page);
  }

  async selectGeneralHelp() {
    await this.generalHelpButton.click();
    await waitForStableUI(this.page);
  }

  async assertEmergencyBannerShown() {
    await expect(this.emergencyBanner).toBeVisible();
    await expect(this.emergencyCall112).toBeVisible();
    await expect(this.emergencyCall110).toBeVisible();
  }

  async assertTouchTargetSize() {
    const buttons = this.page.locator("button[style*='min-height']");
    const count = await buttons.count();
    for (let i = 0; i < count; i++) {
      const box = await buttons.nth(i).boundingBox();
      if (box) {
        expect(box.height).toBeGreaterThanOrEqual(76);
      }
    }
  }
}

export class CareSosStatusPage {
  readonly page: Page;
  readonly statusText: Locator;
  readonly escalationLevel: Locator;
  readonly helperInfo: Locator;

  constructor(page: Page) {
    this.page = page;
    this.statusText = page.locator("[data-testid='sos-status']").or(
      page.getByText(/ausgelöst|benachrichtigt|angenommen|unterwegs/i)
    );
    this.escalationLevel = page.getByText(/Stufe \d/);
    this.helperInfo = page.getByText(/Hilfe ist unterwegs/i);
  }

  async assertLoaded() {
    await expect(this.page).toHaveURL(/\/care\/sos\//);
  }
}

export class CareSosAlertPage {
  readonly page: Page;
  readonly acceptButton: Locator;
  readonly declineButton: Locator;
  readonly categoryLabel: Locator;
  readonly seniorName: Locator;

  constructor(page: Page) {
    this.page = page;
    this.acceptButton = page.getByText(/Ich helfe/).or(
      page.locator("[data-testid='sos-accept']")
    );
    this.declineButton = page.getByText("Kann nicht").or(
      page.locator("[data-testid='sos-decline']")
    );
    this.categoryLabel = page.locator("[data-testid='sos-category']");
    this.seniorName = page.locator("[data-testid='sos-senior-name']");
  }

  async acceptAlert() {
    await this.acceptButton.click();
    await waitForStableUI(this.page);
  }

  async declineAlert() {
    await this.declineButton.click();
    await waitForStableUI(this.page);
  }
}
