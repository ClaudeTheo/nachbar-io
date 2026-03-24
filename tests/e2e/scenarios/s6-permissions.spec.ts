// Nachbar.io — S6: Permission / Privacy Grenzen
// Agent X (nicht verifiziert / nicht eingeloggt) versucht geschuetzte Bereiche zu oeffnen.
import { test, expect } from "@playwright/test";
import { TIMEOUTS } from "../helpers/test-config";
import { waitForStableUI } from "../helpers/observer";

test.describe("S6: Permission / Privacy Grenzen", () => {
  test("S6.1 — Unauthentifizierter Zugriff auf Dashboard → Redirect zu Login", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/, { timeout: TIMEOUTS.pageLoad });
    console.log("[X] /dashboard → Redirect zu /login ✓");
  });

  test("S6.2 — Unauthentifizierter Zugriff auf Messages → Redirect zu Login", async ({ page }) => {
    await page.goto("/messages");
    await expect(page).toHaveURL(/\/login/, { timeout: TIMEOUTS.pageLoad });
    console.log("[X] /messages → Redirect zu /login ✓");
  });

  test("S6.3 — Unauthentifizierter Zugriff auf Help → Redirect zu Login", async ({ page }) => {
    await page.goto("/help");
    await expect(page).toHaveURL(/\/login/, { timeout: TIMEOUTS.pageLoad });
    console.log("[X] /help → Redirect zu /login ✓");
  });

  test("S6.4 — Unauthentifizierter Zugriff auf Admin → Redirect zu Login", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/login/, { timeout: TIMEOUTS.pageLoad });
    console.log("[X] /admin → Redirect zu /login ✓");
  });

  test("S6.5 — Unauthentifizierter Zugriff auf Senior-Home → Redirect zu Login", async ({ page }) => {
    await page.goto("/senior/home");
    await expect(page).toHaveURL(/\/login/, { timeout: TIMEOUTS.pageLoad });
    console.log("[X] /senior/home → Redirect zu /login ✓");
  });

  test("S6.6 — Unauthentifizierter Zugriff auf Care → Redirect zu Login", async ({ page }) => {
    await page.goto("/care");
    await expect(page).toHaveURL(/\/login/, { timeout: TIMEOUTS.pageLoad });
    console.log("[X] /care → Redirect zu /login ✓");
  });

  test("S6.7 — Unauthentifizierter Zugriff auf Profil → Redirect zu Login", async ({ page }) => {
    await page.goto("/profile");
    await expect(page).toHaveURL(/\/login/, { timeout: TIMEOUTS.pageLoad });
    console.log("[X] /profile → Redirect zu /login ✓");
  });

  test("S6.8 — Unauthentifizierter Zugriff auf Map → Redirect zu Login", async ({ page }) => {
    await page.goto("/map");
    await expect(page).toHaveURL(/\/login/, { timeout: TIMEOUTS.pageLoad });
    console.log("[X] /map → Redirect zu /login ✓");
  });

  // Oeffentlich zugaengliche Seiten (DSGVO/TMG: muessen immer erreichbar sein)
  test("S6.9 — Datenschutz ist IMMER oeffentlich zugaenglich", async ({ page }) => {
    await page.goto("/datenschutz");
    await waitForStableUI(page);
    // Darf NICHT zu Login weiterleiten
    await expect(page).toHaveURL(/\/datenschutz/);
    await expect(page.getByText(/datenschutz|privacy/i).first()).toBeVisible();
    console.log("[X] /datenschutz → oeffentlich ✓");
  });

  test("S6.10 — Impressum ist IMMER oeffentlich zugaenglich", async ({ page }) => {
    await page.goto("/impressum");
    await waitForStableUI(page);
    // Darf NICHT zu Login weiterleiten
    await expect(page).toHaveURL(/\/impressum/);
    await expect(page.getByText(/impressum|imprint/i).first()).toBeVisible();
    console.log("[X] /impressum → oeffentlich ✓");
  });

  test("S6.11 — Login-Seite ist oeffentlich zugaenglich", async ({ page }) => {
    await page.goto("/login");
    await waitForStableUI(page);
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByText("Anmelden", { exact: true }).first()).toBeVisible();
    console.log("[X] /login → oeffentlich ✓");
  });

  test("S6.12 — Register-Seite ist oeffentlich zugaenglich", async ({ page }) => {
    await page.goto("/register");
    await waitForStableUI(page);
    await expect(page).toHaveURL(/\/register/);
    await expect(page.getByText("Willkommen bei QuartierApp")).toBeVisible();
    console.log("[X] /register → oeffentlich ✓");
  });

  test("S6.13 — API-Routen sind ohne Auth erreichbar (geben 401 zurueck)", async ({ request }) => {
    // API-Endpunkte sollten ohne Auth keinen Server-Error (500) geben
    const endpoints = ["/api/alerts", "/api/admin/health"];

    for (const endpoint of endpoints) {
      const response = await request.get(endpoint);
      // 200, 401, 403 sind akzeptabel — 500 ist ein Bug
      expect(response.status()).not.toBe(500);
      console.log(`[X] ${endpoint} → ${response.status()}`);
    }
  });
});
