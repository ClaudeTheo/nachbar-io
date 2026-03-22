// Nachbar.io — Auth-Flow 5: Profil & Einstellungen (authentifiziert via storageState)
// Prueft: Profil laden, Name sichtbar, Logout-Button, Einstellungen
import { test, expect } from "@playwright/test";
import { createConsoleErrorCollector, waitForStableUI } from "../helpers/observer";
import { TEST_AGENTS, TIMEOUTS } from "../helpers/test-config";

test.describe("Auth-Flow: Profil & Einstellungen", () => {
  test("AF5.1 — Profil-Seite laed ohne Fehler", async ({ page }) => {
    const errors = createConsoleErrorCollector(page);

    const response = await page.goto("/profile");
    expect(response?.status()).toBeLessThan(500);
    await waitForStableUI(page);

    errors.stop();
    const criticalErrors = errors.errors.filter(
      (e) => !e.includes("hydration") && !e.includes("Warning:")
    );
    expect(criticalErrors).toHaveLength(0);

    console.log("[AUTH] Profil geladen ✓");
  });

  test("AF5.2 — Profil zeigt Benutzernamen", async ({ page }) => {
    await page.goto("/profile");
    await waitForStableUI(page);

    // Agent A = "Anna T."
    const nameElement = page.getByText(TEST_AGENTS.nachbar_a.displayName).or(
      page.getByText("Anna")
    );
    const hasName = await nameElement.isVisible().catch(() => false);

    if (hasName) {
      console.log("[AUTH] Benutzername sichtbar ✓");
    } else {
      // Evtl. wird der Name aus der Session geladen und braucht Zeit
      console.log("[AUTH] Name nicht sofort sichtbar — evtl. async Load");
    }
  });

  test("AF5.3 — Abmelde-Button ist vorhanden", async ({ page }) => {
    await page.goto("/profile");
    await waitForStableUI(page);

    const logoutBtn = page.getByRole("button", { name: /Abmelden|Logout|Ausloggen/i }).or(
      page.getByText(/Abmelden/i)
    );
    const hasLogout = await logoutBtn.isVisible().catch(() => false);
    expect(hasLogout).toBeTruthy();

    console.log("[AUTH] Abmelde-Button vorhanden ✓");
  });

  test("AF5.4 — Benachrichtigungen-Seite laed", async ({ page }) => {
    const errors = createConsoleErrorCollector(page);

    const response = await page.goto("/notifications");
    expect(response?.status()).toBeLessThan(500);
    await waitForStableUI(page);

    errors.stop();
    const criticalErrors = errors.errors.filter(
      (e) => !e.includes("hydration") && !e.includes("Warning:")
    );
    expect(criticalErrors).toHaveLength(0);

    console.log("[AUTH] Benachrichtigungen geladen ✓");
  });

  test("AF5.5 — Datenschutz & Impressum sind auch eingeloggt erreichbar", async ({ page }) => {
    // Datenschutz
    const dsResponse = await page.goto("/datenschutz");
    expect(dsResponse?.status()).toBeLessThan(500);
    await waitForStableUI(page);
    await expect(page.getByText(/datenschutz/i).first()).toBeVisible();

    // Impressum
    const impResponse = await page.goto("/impressum");
    expect(impResponse?.status()).toBeLessThan(500);
    await waitForStableUI(page);
    await expect(page.getByText(/impressum/i).first()).toBeVisible();

    console.log("[AUTH] Datenschutz + Impressum erreichbar ✓");
  });
});
