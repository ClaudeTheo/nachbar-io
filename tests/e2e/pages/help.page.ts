// Nachbar.io — Page Object: Hilfe-Boerse
import { Page, Locator, expect } from "@playwright/test";
import { TIMEOUTS } from "../helpers/test-config";
import { waitForStableUI } from "../helpers/observer";

export class HelpPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly createButton: Locator;
  readonly needsTab: Locator;
  readonly offersTab: Locator;
  readonly helpCards: Locator;
  readonly filterButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByText("Hilfe-Börse").first();
    this.createButton = page.locator("[data-testid='create-help-button']");
    this.needsTab = page.getByRole("tab", { name: /Gesuche|Suche/i });
    this.offersTab = page.getByRole("tab", { name: /Angebote|Biete/i });
    this.helpCards = page.locator("[data-testid='help-card']");
    this.filterButton = page.locator("[data-testid='help-filter-button']");
  }

  async goto() {
    await this.page.goto("/help");
    await waitForStableUI(this.page);
  }

  async assertLoaded() {
    await expect(this.page).toHaveURL(/\/help/);
  }

  async getCardCount(): Promise<number> {
    return this.helpCards.count();
  }

  async clickFirstCard() {
    await this.helpCards.first().click();
    await this.page.waitForURL("**/help/**", { timeout: TIMEOUTS.pageLoad });
  }

  async findCardByText(text: string | RegExp): Promise<Locator> {
    return this.helpCards.filter({ hasText: text });
  }
}

export class HelpNewPage {
  readonly page: Page;
  readonly needButton: Locator;
  readonly offerButton: Locator;
  readonly titleInput: Locator;
  readonly descriptionInput: Locator;
  readonly submitButton: Locator;
  readonly categoryButtons: Locator;

  constructor(page: Page) {
    this.page = page;
    this.needButton = page.getByText("Hilfe suchen");
    this.offerButton = page.getByText("Hilfe anbieten");
    this.titleInput = page.getByLabel(/Titel/i);
    this.descriptionInput = page.getByLabel(/Beschreibung/i);
    this.submitButton = page.getByRole("button", { name: /veröffentlichen|absenden|erstellen/i });
    this.categoryButtons = page.locator("button").filter({ hasText: /Garten|Einkaufen|Fahrdienst|IT|Kinderbetreuung|Handwerk|Tierbetreuung|Nachhilfe|Gesellschaft|Paketannahme|Sonstiges/i });
  }

  async goto() {
    await this.page.goto("/help/new");
    await waitForStableUI(this.page);
  }

  async createHelpRequest(options: {
    type: "need" | "offer";
    category: string;
    title?: string;
    description?: string;
  }) {
    // Typ waehlen
    if (options.type === "need") {
      await this.needButton.click();
    } else {
      await this.offerButton.click();
    }

    // Kategorie waehlen (erster passender Button)
    await this.page.getByText(options.category, { exact: false }).first().click();
    await this.page.waitForTimeout(500);

    // Falls Unterkategorie -> erste Option waehlen
    const subcatButton = this.page.locator("[data-testid='help-subcategory']").first();
    if (await subcatButton.isVisible().catch(() => false)) {
      await subcatButton.click();
      await this.page.waitForTimeout(500);
    }

    // Titel und Beschreibung (wenn Input sichtbar)
    if (options.title) {
      const titleField = this.page.getByLabel(/Titel/i).or(this.titleInput);
      if (await titleField.isVisible().catch(() => false)) {
        await titleField.fill(options.title);
      }
    }

    if (options.description) {
      const descField = this.page.getByLabel(/Beschreibung|Details/i).or(this.descriptionInput);
      if (await descField.isVisible().catch(() => false)) {
        await descField.fill(options.description);
      }
    }

    // Absenden
    await this.submitButton.click();
    await waitForStableUI(this.page);
  }
}
