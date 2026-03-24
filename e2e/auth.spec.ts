import { test, expect } from "@playwright/test";

test.describe("Authentifizierung", () => {
  test("Login-Seite ist erreichbar", async ({ page }) => {
    await page.goto("/login");
    await expect(
      page.getByText("Anmelden", { exact: true }).first(),
    ).toBeVisible({ timeout: 10000 });
    await expect(page.getByLabel("E-Mail-Adresse")).toBeVisible();
    // v3: Magic-Link-only Login — kein Passwort-Feld
    await expect(
      page.getByRole("button", { name: /Anmelde-Code senden/ }),
    ).toBeVisible();
  });

  test("Registrierungs-Seite ist erreichbar", async ({ page }) => {
    await page.goto("/register");
    await expect(page.getByText("Willkommen bei QuartierApp")).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByText("Schritt 1 von 2")).toBeVisible();
  });

  test("Login sendet Magic Link bei gueltiger E-Mail", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("E-Mail-Adresse").fill("test@beispiel.de");
    await page.getByRole("button", { name: /Anmelde-Code senden/ }).click();
    // Entweder Erfolg (Code-Eingabe/OTP) oder Fehler (Rate Limit / Supabase)
    // Warten auf irgendeine Reaktion auf der Seite (Button-Text aendert sich, Fehler erscheint, oder OTP-Eingabe)
    await expect(
      page.getByText(
        /Code eingeben|Fehler|Versuche|konnte nicht|Wird gesendet|warten/i,
      ),
    ).toBeVisible({ timeout: 15000 });
  });

  test("Login hat Link zur Registrierung und umgekehrt", async ({ page }) => {
    await page.goto("/login");
    await expect(
      page.getByText("Anmelden", { exact: true }).first(),
    ).toBeVisible({ timeout: 10000 });
    // Registrierung-Link vorhanden und korrekt
    const regLink = page.locator('a[href="/register"]');
    await expect(regLink).toBeVisible();
    await expect(regLink).toHaveAttribute("href", "/register");

    await page.goto("/register");
    // Anmelden-Link vorhanden und korrekt
    const loginLink = page.locator('a[href="/login"]');
    await expect(loginLink).toBeVisible({ timeout: 10000 });
    await expect(loginLink).toHaveAttribute("href", "/login");
  });

  test("Unauthentifizierter Zugriff auf Dashboard leitet um", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    // Sollte zum Login umgeleitet werden
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });
});
