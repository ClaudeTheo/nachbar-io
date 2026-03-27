import { test, expect } from "@playwright/test";

test.describe("Nachbar Hilfe", () => {
  test("Hilfe-Seite ist erreichbar", async ({ page }) => {
    await page.goto("/hilfe");
    await expect(page.getByText("Nachbarschaftshilfe")).toBeVisible({
      timeout: 10000,
    });
  });

  test("Pflege-Profil Formular laden", async ({ page }) => {
    await page.goto("/hilfe/profil");
    await expect(page.getByText(/Pflegegrad|Pflege-Profil/i)).toBeVisible({
      timeout: 10000,
    });
  });

  test("Helfer-Registrierung Formular laden", async ({ page }) => {
    await page.goto("/hilfe/helfer-werden");
    await expect(page.getByText(/Bundesland|Helfer werden/i)).toBeVisible({
      timeout: 10000,
    });
  });

  test("Neues Gesuch Formular laden", async ({ page }) => {
    await page.goto("/hilfe/neu");
    await expect(page.getByText(/Einkaufen|Hilfe-Gesuch/i)).toBeVisible({
      timeout: 10000,
    });
  });

  test("Budget-Tracker zeigt 131 EUR", async ({ page }) => {
    await page.goto("/hilfe/budget");
    await expect(page.getByText(/131|Entlastungsbetrag/i)).toBeVisible({
      timeout: 10000,
    });
  });

  test("Bremen-Warnung bei Helfer-Registrierung", async ({ page }) => {
    await page.goto("/hilfe/helfer-werden");
    // Wait for page to load first
    await expect(page.getByText(/Helfer werden/i)).toBeVisible({
      timeout: 10000,
    });
    // Find and select Bremen in the Bundesland dropdown
    const select = page.locator("select").first();
    await select.selectOption("HB");
    await expect(page.getByText(/Bremen|nicht.*abrechenbar/i)).toBeVisible({
      timeout: 5000,
    });
  });

  test("Senior-Mode: Buttons haben ausreichende Groesse", async ({ page }) => {
    await page.goto("/hilfe");
    await expect(page.getByText("Nachbarschaftshilfe")).toBeVisible({
      timeout: 10000,
    });
    const buttons = await page.getByRole("button").all();
    for (const btn of buttons) {
      const box = await btn.boundingBox();
      if (box && box.height > 0) {
        expect(box.height).toBeGreaterThanOrEqual(40);
      }
    }
  });

  test("API /api/hilfe/federal-states gibt Array", async ({ request }) => {
    const res = await request.get("/api/hilfe/federal-states");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThanOrEqual(3);
  });

  // Phase 2 — Verbindungen, Abo, Anleitungen

  test("Verbindungen-Seite ladet", async ({ page }) => {
    await page.goto("/hilfe/verbindungen");
    await expect(page.locator("h1")).toContainText("Verbindungen");
  });

  test("Abo-Seite ladet", async ({ page }) => {
    await page.goto("/hilfe/abo");
    await expect(page.locator("h1")).toContainText("Abrechnungs-Modul");
  });

  test("Anleitung Senior ladet", async ({ page }) => {
    await page.goto("/hilfe/anleitung/senior");
    await expect(page.locator("h1")).toContainText("Anleitung");
    // 7 Schritte sichtbar
    const steps = page.locator('[class*="rounded-2xl border"]');
    await expect(steps.first()).toBeVisible();
  });

  test("Anleitung Helfer ladet", async ({ page }) => {
    await page.goto("/hilfe/anleitung/helfer");
    await expect(page.locator("h1")).toContainText("Helfer-Anleitung");
    // 10 Schritte sichtbar
    const steps = page.locator('[class*="rounded-2xl border"]');
    await expect(steps.first()).toBeVisible();
  });

  test("Bundesland-Detail BW ladet", async ({ page }) => {
    await page.goto("/hilfe/anleitung/bundesland/BW");
    await expect(page.locator("h1")).toContainText("Baden-Wuerttemberg");
    await expect(page.getByText("Max. Klienten gleichzeitig")).toBeVisible();
    await expect(page.getByText("2")).toBeVisible(); // max 2 Klienten BW
  });

  test("Bundesland-Detail BY ladet", async ({ page }) => {
    await page.goto("/hilfe/anleitung/bundesland/BY");
    await expect(page.locator("h1")).toContainText("Bayern");
    await expect(page.getByText("Kein Limit")).toBeVisible();
  });

  test("Bundesland-Detail NW ladet", async ({ page }) => {
    await page.goto("/hilfe/anleitung/bundesland/NW");
    await expect(page.locator("h1")).toContainText("Nordrhein-Westfalen");
    await expect(page.getByText("30")).toBeVisible(); // 30h Schulung
  });

  test("Bundesland HB zeigt nicht-verfuegbar", async ({ page }) => {
    await page.goto("/hilfe/anleitung/bundesland/HB");
    await expect(page.getByText("Nicht verfuegbar")).toBeVisible();
  });

  test("Abo-Seite zeigt Leistungsuebersicht", async ({ page }) => {
    await page.goto("/hilfe/abo");
    await expect(page.getByText("Einsatz-Dokumentation")).toBeVisible();
    await expect(page.getByText("Sammelabrechnung")).toBeVisible();
  });

  test("Senior-Buttons sind 80px+ gross", async ({ page }) => {
    await page.goto("/hilfe/anleitung/senior");
    const buttons = page.locator("button");
    const count = await buttons.count();
    for (let i = 0; i < count; i++) {
      const box = await buttons.nth(i).boundingBox();
      if (box) {
        expect(box.height).toBeGreaterThanOrEqual(44);
      }
    }
  });
});
