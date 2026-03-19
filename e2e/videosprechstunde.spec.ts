import { test, expect } from "@playwright/test";

test.describe("Videosprechstunde", () => {
  test("Patient kann Sprechstunde-Seite aufrufen", async ({ page }) => {
    await page.goto("/sprechstunde");
    await expect(page.getByRole("heading", { name: /Ärzte/i })).toBeVisible();
  });

  test("Patient kann Termin-Übersicht aufrufen", async ({ page }) => {
    await page.goto("/care/consultations");
    await expect(page.getByRole("heading", { name: /Meine Termine/i })).toBeVisible();
  });

  test("Terminverhandlung: Tabs werden angezeigt", async ({ page }) => {
    await page.goto("/care/consultations");
    await expect(page.getByText("Offene Vorschläge")).toBeVisible();
    await expect(page.getByText("Bestätigt")).toBeVisible();
    await expect(page.getByText("Vergangene")).toBeVisible();
  });

  test("Termin-Verhandlung: Vorschlag → Gegenvorschlag → Bestätigung", async ({ page: _page }) => {
    // Dieser Test braucht Auth-Setup und Test-Daten
    // Implementierung haengt von bestehendem E2E-Auth-Setup ab
    test.skip();
  });
});
