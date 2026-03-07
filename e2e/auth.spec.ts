import { test, expect } from "@playwright/test";

test.describe("Authentifizierung", () => {
  test("Login-Seite ist erreichbar", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByText("Anmelden", { exact: true }).first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByLabel("E-Mail-Adresse")).toBeVisible();
    await expect(page.getByLabel("Passwort")).toBeVisible();
  });

  test("Registrierungs-Seite ist erreichbar", async ({ page }) => {
    await page.goto("/register");
    await expect(page.getByText("Registrieren")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Schritt 1 von 4")).toBeVisible();
  });

  test("Login zeigt Fehler bei ungültigen Daten", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("E-Mail-Adresse").fill("falsch@test.de");
    await page.getByLabel("Passwort").fill("falschespasswort");
    await page.getByRole("button", { name: "Anmelden" }).click();
    // Fehler-Nachricht: "E-Mail oder Passwort ist falsch."
    await expect(page.getByText(/falsch|Fehler|error/i)).toBeVisible({ timeout: 15000 });
  });

  test("Registrierung blockiert kurzes Passwort", async ({ page }) => {
    await page.goto("/register");
    await expect(page.getByLabel("E-Mail-Adresse")).toBeVisible({ timeout: 10000 });
    await page.getByLabel("E-Mail-Adresse").fill("test@test.de");
    await page.getByLabel("Passwort").fill("kurz");
    await page.getByRole("button", { name: "Weiter" }).click();
    // Browser-native minLength-Validierung verhindert Weiterleitung — Schritt 1 bleibt sichtbar
    await expect(page.getByText("Schritt 1 von 4")).toBeVisible();
  });

  test("Link zwischen Login und Registrierung funktioniert", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("link", { name: "Jetzt registrieren" }).click();
    await expect(page).toHaveURL(/\/register/);

    await page.getByRole("link", { name: "Jetzt anmelden" }).click();
    await expect(page).toHaveURL(/\/login/);
  });

  test("Unauthentifizierter Zugriff auf Dashboard leitet um", async ({ page }) => {
    await page.goto("/dashboard");
    // Sollte zum Login umgeleitet werden
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });
});
