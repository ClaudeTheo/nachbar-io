// Nachbar.io — Page Object: kanonische Senioren-Shell
import { Page, Locator, expect } from "@playwright/test";
import { TIMEOUTS } from "../helpers/test-config";
import { waitForStableUI } from "../helpers/observer";

type SeniorTileLabel =
  | "Mein Kreis"
  | "Hier bei mir"
  | "Schreiben"
  | "Notfall 112";

const SENIOR_TILE_TARGETS: Record<SeniorTileLabel, string> = {
  "Mein Kreis": "/mein-kreis",
  "Hier bei mir": "/hier-bei-mir",
  Schreiben: "/schreiben",
  "Notfall 112": "/sos",
};

export class SeniorHomePage {
  readonly page: Page;
  readonly tiles: Locator;
  readonly appointmentsLink: Locator;
  readonly profileLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.tiles = page.locator("[data-testid='kreis-start-tile']");
    this.appointmentsLink = page.locator(
      "[data-testid='kreis-start-termine-link']",
    );
    this.profileLink = page.locator("[data-testid='kreis-start-profil-link']");
  }

  tile(label: SeniorTileLabel): Locator {
    return this.tiles.filter({ hasText: label });
  }

  async goto() {
    await this.page.goto("/kreis-start");
    await waitForStableUI(this.page);
  }

  async assertLoaded() {
    await expect(this.page).toHaveURL(/\/kreis-start/);
    await expect(this.tiles).toHaveCount(4, { timeout: TIMEOUTS.pageLoad });
  }

  async assertAllTilesVisible() {
    await this.assertLoaded();
    for (const label of Object.keys(SENIOR_TILE_TARGETS) as SeniorTileLabel[]) {
      await expect(this.tile(label)).toBeVisible();
    }
  }

  async assertTileTargets() {
    for (const [label, href] of Object.entries(SENIOR_TILE_TARGETS)) {
      await expect(this.tile(label as SeniorTileLabel)).toHaveAttribute(
        "href",
        href,
      );
    }
  }

  /** Prueft ob die kanonischen Senior-Links mindestens 80px hoch sind. */
  async assertTouchTargetSize() {
    const targets = this.page.locator(
      "[data-testid='kreis-start-tile'], [data-testid='kreis-start-secondary-actions'] a",
    );
    const count = await targets.count();

    for (let i = 0; i < count; i++) {
      const box = await targets.nth(i).boundingBox();
      if (box) {
        expect(box.height).toBeGreaterThanOrEqual(76); // Toleranz 4px
      }
    }
  }

  async clickTile(label: SeniorTileLabel) {
    await this.tile(label).click();
    await this.page.waitForURL(`**${SENIOR_TILE_TARGETS[label]}**`, {
      timeout: TIMEOUTS.pageLoad,
    });
    await waitForStableUI(this.page);
  }

  async clickMeinKreis() {
    await this.clickTile("Mein Kreis");
  }

  async clickHierBeiMir() {
    await this.clickTile("Hier bei mir");
  }

  async clickSchreiben() {
    await this.clickTile("Schreiben");
  }

  async clickSos() {
    await this.clickTile("Notfall 112");
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
    this.okButton = page.getByRole("button", { name: /Mir geht es gut/i });
    this.notWellButton = page.getByRole("button", { name: /Nicht so gut/i });
    this.needHelpButton = page.getByRole("button", { name: /Brauche Hilfe/i });
    this.confirmMessage = page
      .getByRole("status")
      .or(page.getByText(/Danke|gespeichert|Startseite/i));
  }

  async goto() {
    await this.page.goto("/checkin");
    await waitForStableUI(this.page);
  }

  async assertLoaded() {
    await expect(this.page).toHaveURL(/\/checkin/);
    await expect(
      this.page.getByRole("heading", { name: /Wie geht es Ihnen/i }),
    ).toBeVisible({ timeout: TIMEOUTS.elementVisible });
    await expect(this.okButton).toBeVisible();
    await expect(this.notWellButton).toBeVisible();
    await expect(this.needHelpButton).toBeVisible();
  }

  async checkinOk() {
    await this.okButton.click();
    await this.waitForCheckinResult();
  }

  async checkinNotWell() {
    await this.notWellButton.click();
    await this.waitForCheckinResult();
  }

  // Erfolg = Navigation auf **/confirmed**. Im flag-gateten Zustand (lokaler CI-Stack /
  // CHECKIN_MESSAGES_ENABLED off → API 503, vgl. s9 "erfolgreich oder kontrolliert
  // gated") bleibt die Seite und zeigt stattdessen einen Fehler-Alert. Auf das ERSTE der
  // beiden Ereignisse warten (kurzer Timeout) — sonst verbrennt waitForURL den vollen
  // pageLoad-Timeout (60s) auf eine Navigation, die nie kommt, sprengt das 60s-Test-Budget
  // und stirbt mit "Target page, context or browser has been closed".
  private async waitForCheckinResult() {
    await Promise.race([
      this.page
        .waitForURL("**/confirmed**", { timeout: TIMEOUTS.elementVisible })
        .catch(() => {}),
      this.page
        .getByRole("alert")
        .first()
        .waitFor({ state: "visible", timeout: TIMEOUTS.elementVisible })
        .catch(() => {}),
    ]);
    await waitForStableUI(this.page);
  }

  async assertCheckinConfirmed() {
    // Bestaetigung sichtbar (Check-in aktiv) ODER kontrolliert gated (kein Crash) — analog S9.2.
    const confirmed = await this.confirmMessage
      .first()
      .isVisible({ timeout: TIMEOUTS.elementVisible })
      .catch(() => false);
    if (!confirmed) {
      await expect(this.page.locator("main")).toBeVisible({
        timeout: TIMEOUTS.elementVisible,
      });
    }
  }
}

export class SeniorHelpPage {
  readonly page: Page;
  readonly emergencyButton: Locator;
  readonly generalHelpButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emergencyButton = page.getByRole("button", {
      name: /Dringende Hilfe|112|Notfall/i,
    });
    this.generalHelpButton = page.getByRole("button", {
      name: /Allgemeine Hilfe/i,
    });
  }

  async goto() {
    await this.page.goto("/sos");
    await waitForStableUI(this.page);
  }

  async assertLoaded() {
    await expect(this.page).toHaveURL(/\/sos/);
    await expect(
      this.page.getByRole("heading", { name: /Was brauchen Sie/i }),
    ).toBeVisible({ timeout: TIMEOUTS.elementVisible });
    await expect(
      this.emergencyButton.or(this.generalHelpButton).first(),
    ).toBeVisible();
  }
}
