import { test, expect } from "@playwright/test";

test.describe("Einladungscode & Registrierung", () => {
  test("Landing-Page zeigt Registrieren-Button", async ({ page }) => {
    await page.goto("/");
    const registerLink = page.getByRole("link", { name: "Registrieren" });
    await expect(registerLink).toBeVisible({ timeout: 10000 });
    await expect(registerLink).toHaveAttribute("href", "/register");
  });

  test("Landing-Page zeigt Anmelden-Button", async ({ page }) => {
    await page.goto("/");
    const loginLink = page.getByRole("link", { name: "Anmelden" });
    await expect(loginLink).toBeVisible({ timeout: 10000 });
    await expect(loginLink).toHaveAttribute("href", "/login");
  });

  test("Registrierung startet mit Schritt 1 von 4", async ({ page }) => {
    await page.goto("/register");
    await expect(page.getByText("Schritt 1 von 4")).toBeVisible({ timeout: 10000 });
    await expect(page.getByLabel("E-Mail-Adresse")).toBeVisible();
    await expect(page.getByLabel("Passwort")).toBeVisible();
  });

  test("Schritt 1 → Schritt 2 (Einladungscode) navigiert korrekt", async ({ page }) => {
    await page.goto("/register");
    await expect(page.getByText("Schritt 1 von 4")).toBeVisible({ timeout: 10000 });

    // Gueltige E-Mail und Passwort eingeben
    await page.getByLabel("E-Mail-Adresse").fill("testuser@beispiel.de");
    await page.getByLabel("Passwort").fill("sicheres_passwort_123");
    await page.getByRole("button", { name: "Weiter" }).click();

    // Schritt 2: Einladungscode
    await expect(page.getByText("Schritt 2 von 4")).toBeVisible({ timeout: 10000 });
    await expect(page.getByLabel("Einladungscode")).toBeVisible();
  });

  test("Ungueltiger Einladungscode zeigt Fehlermeldung", async ({ page }) => {
    await page.goto("/register");
    await expect(page.getByText("Schritt 1 von 4")).toBeVisible({ timeout: 10000 });

    // Schritt 1 ausfuellen
    await page.getByLabel("E-Mail-Adresse").fill("testuser@beispiel.de");
    await page.getByLabel("Passwort").fill("sicheres_passwort_123");
    await page.getByRole("button", { name: "Weiter" }).click();

    // Schritt 2: Ungueltigen Code eingeben
    await expect(page.getByLabel("Einladungscode")).toBeVisible({ timeout: 10000 });
    await page.getByLabel("Einladungscode").fill("UNGUELTI");
    await page.getByRole("button", { name: /Code pr|Weiter/ }).click();

    // Fehlermeldung erwarten (Supabase gibt Fehler zurueck)
    await expect(page.getByText(/Ungültiger|nicht gefunden|falsch|Fehler|Verbindungsfehler/i)).toBeVisible({ timeout: 15000 });
  });

  test("Passwort-Validierung: zu kurzes Passwort blockiert Schritt 1", async ({ page }) => {
    await page.goto("/register");
    await expect(page.getByText("Schritt 1 von 4")).toBeVisible({ timeout: 10000 });

    await page.getByLabel("E-Mail-Adresse").fill("test@test.de");
    await page.getByLabel("Passwort").fill("kurz");
    await page.getByRole("button", { name: "Weiter" }).click();

    // Sollte auf Schritt 1 bleiben (native minLength-Validierung)
    await expect(page.getByText("Schritt 1 von 4")).toBeVisible();
  });

  test("Registrierungsformular hat 4 Schritte im Header", async ({ page }) => {
    await page.goto("/register");
    // Schritt-Indikator vorhanden
    await expect(page.getByText(/Schritt 1 von 4/)).toBeVisible({ timeout: 10000 });
  });
});
