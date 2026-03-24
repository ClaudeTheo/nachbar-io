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

    // v3: Magic-Link-only — kein Passwort-Feld, stattdessen Anmelde-Code-Button
    await expect(
      page.getByRole("button", { name: /Anmelde-Code senden/ }),
    ).toBeVisible();
  });

  test("Registrierungsschritte navigieren korrekt", async ({ page }) => {
    await page.goto("/register");

    // Schritt 1: Einstieg (Einladungscode oder Quartier finden)
    await expect(page.getByText("Schritt 1 von 2")).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByText(/Einladungscode/)).toBeVisible();
    await expect(page.getByText(/Quartier finden/)).toBeVisible();
  });
});
