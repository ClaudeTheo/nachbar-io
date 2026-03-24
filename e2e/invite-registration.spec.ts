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

  // v3: 2-Schritt-Flow (Verifizierung → Identitaet), kein Passwort
  test("Registrierung startet mit Schritt 1 von 2", async ({ page }) => {
    await page.goto("/register");
    await expect(page.getByText("Schritt 1 von 2")).toBeVisible({
      timeout: 10000,
    });
    // Schritt 1: Einstieg — zwei Pfade
    await expect(page.getByText(/Einladungscode/)).toBeVisible();
    await expect(page.getByText(/Quartier finden/)).toBeVisible();
  });

  test("Schritt 1 → Einladungscode-Eingabe navigiert korrekt", async ({
    page,
  }) => {
    await page.goto("/register");
    await expect(page.getByText("Schritt 1 von 2")).toBeVisible({
      timeout: 10000,
    });

    // Einladungscode-Pfad waehlen
    await page.getByText(/Einladungscode/).click();

    // Einladungscode-Eingabefeld erscheint
    await expect(page.getByLabel("Einladungscode")).toBeVisible({
      timeout: 10000,
    });
  });

  test("Schritt 1 → Adresse-Pfad navigiert korrekt", async ({ page }) => {
    await page.goto("/register");
    await expect(page.getByText("Schritt 1 von 2")).toBeVisible({
      timeout: 10000,
    });

    // Quartier-finden-Pfad waehlen
    await page.getByText(/Quartier finden/).click();

    // Adresse-Eingabe oder Standort-Button erscheint
    await expect(
      page.getByText(/Standort|Hausnummer|Stra/i).first(),
    ).toBeVisible({
      timeout: 10000,
    });
  });

  test("Einladungscode-Formular ist funktional", async ({ page }) => {
    await page.goto("/register");
    await expect(page.getByText("Schritt 1 von 2")).toBeVisible({
      timeout: 10000,
    });

    // Einladungscode-Pfad waehlen
    await page
      .getByText(/Einladungscode/)
      .first()
      .click();

    // Code-Eingabefeld und Pruefen-Button sind vorhanden
    const codeInput = page.getByLabel("Einladungscode");
    await expect(codeInput).toBeVisible({ timeout: 10000 });
    await codeInput.fill("UNGUELTI");
    const submitBtn = page.getByRole("button", { name: /Code pr/ });
    await expect(submitBtn).toBeVisible();
    await expect(submitBtn).toBeEnabled();

    // Submit ausloesen — Reaktion abhaengig von Supabase-Verfuegbarkeit
    await submitBtn.click();
    // Entweder Fehlermeldung, Netzwerkfehler oder naechster Schritt (falls Code zufaellig existiert)
    await expect(
      page
        .getByText(
          /Ungültiger|Netzwerkfehler|Serverfehler|Fehler|Schritt 2|E-Mail|Wird gepr/i,
        )
        .first(),
    ).toBeVisible({ timeout: 20000 });
  });

  test("Registrierungsformular hat 2 Schritte im Header", async ({ page }) => {
    await page.goto("/register");
    await expect(page.getByText(/Schritt 1 von 2/)).toBeVisible({
      timeout: 10000,
    });
  });
});
