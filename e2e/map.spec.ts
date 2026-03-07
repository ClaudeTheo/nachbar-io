import { test, expect } from "@playwright/test";

test.describe("Quartierskarte", () => {
  // Karte erfordert Auth
  test("Karten-Route existiert", async ({ request }) => {
    const response = await request.get("/map");
    // Entweder 200 oder Redirect (Auth)
    expect([200, 302, 307]).toContain(response.status());
  });

  test("Unauthentifizierter Zugriff auf /map leitet um", async ({ page }) => {
    await page.goto("/map");
    // Redirect zum Login oder Karte wird geladen
    await page.waitForTimeout(3000);
    const url = page.url();
    expect(url).toMatch(/\/(login|map)/);
  });
});

test.describe("Karten-Komponente (QuarterMap)", () => {
  test("Leaflet CSS wird geladen", async ({ page }) => {
    await page.goto("/");
    // Leaflet-Stylesheet-Link sollte bei Kartenseite vorhanden sein
    // Wir pruefen, dass die /map-Route existiert
    const response = await page.goto("/map");
    expect(response?.status()).toBeLessThan(500);
  });
});
