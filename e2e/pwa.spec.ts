import { test, expect } from "@playwright/test";

test.describe("PWA & Service Worker", () => {
  test("Manifest ist vorhanden und korrekt", async ({ page }) => {
    await page.goto("/");
    const manifestLink = page.locator('link[rel="manifest"]');
    await expect(manifestLink).toHaveCount(1);

    // Manifest direkt abrufen
    const response = await page.goto("/manifest.json");
    expect(response?.status()).toBe(200);
    const manifest = await response?.json();
    expect(manifest.name).toBeTruthy();
    expect(manifest.short_name).toBeTruthy();
    expect(manifest.start_url).toBeTruthy();
    expect(manifest.display).toBe("standalone");
  });

  test("Service Worker Datei ist erreichbar", async ({ page }) => {
    const response = await page.goto("/sw.js");
    expect(response?.status()).toBe(200);
    const contentType = response?.headers()["content-type"];
    expect(contentType).toContain("javascript");
  });

  test("App-Icons sind vorhanden", async ({ page }) => {
    const response = await page.goto("/manifest.json");
    const manifest = await response?.json();
    expect(manifest.icons).toBeDefined();
    expect(manifest.icons.length).toBeGreaterThan(0);

    // Erstes Icon prüfen
    const iconResponse = await page.goto(manifest.icons[0].src);
    expect(iconResponse?.status()).toBe(200);
  });
});
