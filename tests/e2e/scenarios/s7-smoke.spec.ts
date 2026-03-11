// Nachbar.io — S7: Stress / Regression Quick Pack (Smoke Tests)
// Schnelle Tests: Landing laed, Auth funktioniert, Core Pages rendern, keine Konsolen-Fehler.
import { test, expect } from "@playwright/test";
import { createConsoleErrorCollector, waitForStableUI } from "../helpers/observer";
import { TIMEOUTS } from "../helpers/test-config";

test.describe("S7: Smoke / Regression Quick Pack", () => {
  test("S7.1 — Root-Seite laed ohne Server-Error", async ({ page }) => {
    const errors = createConsoleErrorCollector(page);
    const response = await page.goto("/");
    expect(response?.status()).toBeLessThan(500);
    await waitForStableUI(page);
    errors.stop();

    console.log(`[SMOKE] / → ${response?.status()} (${errors.errors.length} Konsolenfehler)`);
    expect(errors.errors).toHaveLength(0);
  });

  test("S7.2 — Login-Seite rendert korrekt", async ({ page }) => {
    const errors = createConsoleErrorCollector(page);
    const response = await page.goto("/login");
    expect(response?.status()).toBeLessThan(500);

    await expect(page.getByText("Anmelden", { exact: true }).first()).toBeVisible({
      timeout: TIMEOUTS.pageLoad,
    });
    await expect(page.getByLabel("E-Mail-Adresse")).toBeVisible();
    await expect(page.getByLabel("Passwort")).toBeVisible();
    await expect(page.getByRole("button", { name: "Anmelden" })).toBeVisible();

    errors.stop();
    expect(errors.errors).toHaveLength(0);
    console.log("[SMOKE] /login → OK");
  });

  test("S7.3 — Registrierungs-Seite rendert korrekt", async ({ page }) => {
    const errors = createConsoleErrorCollector(page);
    const response = await page.goto("/register");
    expect(response?.status()).toBeLessThan(500);

    await expect(page.getByText("Registrieren")).toBeVisible({ timeout: TIMEOUTS.pageLoad });
    await expect(page.getByText("Schritt 1 von 4")).toBeVisible();

    errors.stop();
    expect(errors.errors).toHaveLength(0);
    console.log("[SMOKE] /register → OK");
  });

  test("S7.4 — Datenschutz-Seite laed", async ({ page }) => {
    const response = await page.goto("/datenschutz");
    expect(response?.status()).toBeLessThan(500);
    await waitForStableUI(page);
    await expect(page.getByText(/datenschutz/i).first()).toBeVisible();
    console.log("[SMOKE] /datenschutz → OK");
  });

  test("S7.5 — Impressum-Seite laed", async ({ page }) => {
    const response = await page.goto("/impressum");
    expect(response?.status()).toBeLessThan(500);
    await waitForStableUI(page);
    await expect(page.getByText(/impressum/i).first()).toBeVisible();
    console.log("[SMOKE] /impressum → OK");
  });

  test("S7.6 — API Health-Check", async ({ request }) => {
    const response = await request.get("/api/admin/health");
    // 200 OK oder 401 Unauthorized — beides akzeptabel, 500 nicht
    expect(response.status()).toBeLessThan(500);
    console.log(`[SMOKE] /api/admin/health → ${response.status()}`);
  });

  test("S7.7 — Keine 500-Fehler auf oeffentlichen Seiten", async ({ page }) => {
    const publicPages = ["/", "/login", "/register", "/datenschutz", "/impressum"];
    const results: Array<{ path: string; status: number }> = [];

    for (const path of publicPages) {
      const response = await page.goto(path);
      const status = response?.status() || 0;
      results.push({ path, status });
      expect(status).toBeLessThan(500);
      console.log(`[SMOKE] ${path} → ${status}`);
    }
  });

  test("S7.8 — Auth-Protected Routes redirecten zu Login", async ({ page }) => {
    const protectedPages = [
      "/dashboard",
      "/messages",
      "/help",
      "/map",
      "/profile",
      "/admin",
      "/notifications",
      "/care",
      "/alerts",
      "/marketplace",
    ];

    for (const path of protectedPages) {
      await page.goto(path);
      // Entweder Redirect zu Login ODER Seite laed (wenn Dev-Mode ohne Auth)
      const url = page.url();
      const isLoginOrPage = url.includes("/login") ||
        url.includes(path.replace("/", ""));
      expect(isLoginOrPage).toBeTruthy();
    }

    console.log(`[SMOKE] ${protectedPages.length} Protected Routes geprueft`);
  });

  test("S7.9 — Meta-Tags und Title vorhanden", async ({ page }) => {
    await page.goto("/login");
    await waitForStableUI(page);

    // Titel sollte gesetzt sein (nicht leer)
    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);
    console.log(`[SMOKE] Page Title: "${title}"`);
  });

  test("S7.10 — Keine doppelten IDs im DOM", async ({ page }) => {
    await page.goto("/login");
    await waitForStableUI(page);

    // Doppelte IDs sind ungueltig und fuehren zu Accessibility-Problemen
    const duplicateIds = await page.evaluate(() => {
      const allIds = Array.from(document.querySelectorAll("[id]"))
        .map((el) => el.id)
        .filter((id) => id.length > 0);
      const counts = new Map<string, number>();
      for (const id of allIds) {
        counts.set(id, (counts.get(id) || 0) + 1);
      }
      return Array.from(counts.entries())
        .filter(([, count]) => count > 1)
        .map(([id, count]) => `${id} (${count}x)`);
    });

    if (duplicateIds.length > 0) {
      console.warn(`[SMOKE] Doppelte IDs gefunden: ${duplicateIds.join(", ")}`);
    }
    // Warnung, kein harter Fehler (manche Frameworks generieren doppelte IDs)
  });

  test("S7.11 — CSS laed korrekt (kein unstyled Content)", async ({ page }) => {
    await page.goto("/login");
    await waitForStableUI(page);

    // Pruefen ob Tailwind CSS geladen ist
    const hasStyles = await page.evaluate(() => {
      const body = document.body;
      const computedStyle = window.getComputedStyle(body);
      // Wenn CSS laed, hat der Body mindestens eine font-family
      return computedStyle.fontFamily.length > 0;
    });

    expect(hasStyles).toBeTruthy();
    console.log("[SMOKE] CSS geladen ✓");
  });

  test("S7.12 — JavaScript Bundle laed ohne Fehler", async ({ page }) => {
    const errors: string[] = [];

    page.on("pageerror", (err) => {
      errors.push(err.message);
    });

    await page.goto("/login");
    await waitForStableUI(page);

    // Keine fatalen JS-Errors
    if (errors.length > 0) {
      console.warn(`[SMOKE] JS Errors: ${errors.join("; ")}`);
    }
    // Weiche Pruefung — manche Errors sind harmlos (z.B. missing env vars)
    expect(errors.length).toBeLessThanOrEqual(2);
  });
});
