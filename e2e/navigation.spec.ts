import { test, expect } from "@playwright/test";

test.describe("Navigation & Öffentliche Seiten", () => {
  test("Landing-Page lädt korrekt", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("body")).not.toBeEmpty();
  });

  test("Login-Seite hat korrekte Formular-Elemente", async ({ page }) => {
    await page.goto("/login");
    // E-Mail-Feld
    const emailInput = page.getByLabel("E-Mail-Adresse");
    await expect(emailInput).toBeVisible({ timeout: 10000 });
    await expect(emailInput).toHaveAttribute("type", "email");

    // Passwort-Feld
    const passwordInput = page.getByLabel("Passwort");
    await expect(passwordInput).toBeVisible();
    await expect(passwordInput).toHaveAttribute("type", "password");

    // Submit-Button
    await expect(page.getByRole("button", { name: "Anmelden" })).toBeVisible();
  });

  test("Registrierungsschritte navigieren korrekt", async ({ page }) => {
    await page.goto("/register");

    // Schritt 1: E-Mail & Passwort
    await expect(page.getByText("Schritt 1 von 4")).toBeVisible({ timeout: 10000 });
    await page.getByLabel("E-Mail-Adresse").fill("test@beispiel.de");
    await page.getByLabel("Passwort").fill("sicherespasswort123");
    await page.getByRole("button", { name: "Weiter" }).click();

    // Schritt 2: Invite-Code
    await expect(page.getByText("Schritt 2 von 4")).toBeVisible();
    await expect(page.getByLabel("Einladungscode")).toBeVisible();
  });
});
