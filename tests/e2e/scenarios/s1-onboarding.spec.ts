// Nachbar.io — S1: Onboarding (2-Schritt Magic-Link-Flow)
// Neuer Flow: Entry → [Invite-Code ODER Adresse] → Name+Email → Magic Link gesendet
import { test, expect } from "@playwright/test";
import { RegisterPage, LoginPage } from "../pages";
import { createConsoleErrorCollector } from "../helpers/observer";
import { TEST_AGENTS, TIMEOUTS } from "../helpers/test-config";

test.describe("S1: Onboarding — 2-Schritt Magic-Link-Flow", () => {
  test("S1.1 — Registrierung via Invite-Code bis Magic-Link-Bestaetigung", async ({
    browser,
  }) => {
    const context = await browser.newContext({ locale: "de-DE" });
    const page = await context.newPage();

    // Supabase signInWithOtp mocken — verhindert echte E-Mail-Zustellung
    // und umgeht Supabase's eigenes Email-Rate-Limit (CI schlaegt sonst fehl)
    await page.route("**/auth/v1/otp", async (route) => {
      console.log("[S1.1] OTP-Route intercepted:", route.request().url());
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({}),
      });
    });

    // Debug: Alle API-Responses loggen
    page.on("response", (response) => {
      const url = response.url();
      if (url.includes("/api/") || url.includes("/auth/")) {
        console.log(`[S1.1] ${response.status()} ${url}`);
      }
    });

    // Debug: Console-Fehler der Seite loggen
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        console.log(`[S1.1] CONSOLE ERROR: ${msg.text()}`);
      }
    });

    const registerPage = new RegisterPage(page);
    await registerPage.goto();

    // Einzigartige E-Mail pro Testlauf (vermeidet "bereits registriert"-Fehler)
    const uniqueEmail = `e2e_s1_${Date.now()}@test.nachbar.local`;

    // Entry: Beide Pfade sichtbar
    await registerPage.assertEntryVisible();
    await registerPage.assertOnStep(1);

    // Pfad: Einladungscode waehlen
    await registerPage.chooseInviteCodePath();

    // Invite-Code eingeben → weiter zu Identity
    await registerPage.fillInviteCode(TEST_AGENTS.nachbar_a.inviteCode);
    console.log("[S1.1] Invite-Code geprueft, auf Identity-Step wartend...");

    // Schritt 2: Name + E-Mail (einzigartige E-Mail!)
    await registerPage.assertOnStep(2);
    console.log("[S1.1] Identity-Step erreicht, fuelle Formular...");
    await registerPage.fillIdentity("E2E Testnutzer", uniqueEmail);
    console.log("[S1.1] Formular abgeschickt, warte auf Bestaetigung...");

    // Debug: Page-Inhalt vor Assertion loggen
    await page.waitForTimeout(2000);
    const pageText = await page.locator("body").innerText();
    console.log("[S1.1] Page-Text nach Submit:", pageText.substring(0, 500));

    // Bestaetigung: Magic Link gesendet
    await registerPage.assertMagicLinkSent(uniqueEmail);
    console.log(
      "[A] Magic Link Registrierung erfolgreich — Bestaetigung angezeigt",
    );

    await context.close();
  });

  test("S1.2 — Registrierung mit ungueltigem Invite-Code wird abgelehnt", async ({
    page,
  }) => {
    const registerPage = new RegisterPage(page);
    await registerPage.goto();

    // Invite-Code-Pfad waehlen
    await registerPage.chooseInviteCodePath();

    // Ungueltigen Code eingeben
    await registerPage.fillInviteCode("INVALID1");

    // Fehlermeldung erscheint, bleibt auf Schritt 1
    await registerPage.assertInviteCodeError();
    await registerPage.assertOnStep(1);
  });

  test("S1.3 — Entry zeigt beide Pfade (Code + Adresse)", async ({ page }) => {
    const registerPage = new RegisterPage(page);
    await registerPage.goto();

    // Beide Optionen muessen sichtbar sein
    await registerPage.assertEntryVisible();

    // Beschreibungstexte pruefen
    await expect(
      page.getByText("Per Brief, Aushang oder von einem Nachbarn erhalten"),
    ).toBeVisible();
    await expect(
      page.getByText(
        "Über Adresse oder Standort dem nächsten Quartier beitreten",
      ),
    ).toBeVisible();
  });

  test("S1.4 — Zurueck-Button kehrt zum Entry zurueck", async ({ page }) => {
    const registerPage = new RegisterPage(page);
    await registerPage.goto();

    // Zum Invite-Code-Schritt navigieren
    await registerPage.chooseInviteCodePath();
    await expect(registerPage.inviteCodeInput).toBeVisible();

    // Zurueck zum Entry
    await registerPage.backButton.click();
    await registerPage.assertEntryVisible();

    // Zum Adress-Schritt navigieren
    await registerPage.chooseAddressPath();
    await expect(registerPage.addressSearchInput).toBeVisible();

    // Zurueck zum Entry
    await registerPage.backButton.click();
    await registerPage.assertEntryVisible();
  });

  test("S1.5 — Identity validiert leere Felder", async ({ browser }) => {
    const context = await browser.newContext({ locale: "de-DE" });
    const page = await context.newPage();

    const registerPage = new RegisterPage(page);
    await registerPage.goto();

    // Zum Identity-Schritt gelangen (via gueltigen Invite-Code)
    await registerPage.chooseInviteCodePath();
    await registerPage.fillInviteCode(TEST_AGENTS.nachbar_a.inviteCode);

    // Schritt 2: Ohne Name absenden
    await registerPage.assertOnStep(2);
    await registerPage.emailInput.fill(TEST_AGENTS.nachbar_a.email);
    await registerPage.sendMagicLinkButton.click();

    // Soll auf Schritt 2 bleiben (Browser required-Validierung oder JS-Fehler)
    await registerPage.assertOnStep(2);

    await context.close();
  });

  test("S1.6 — Login: Magic Link als einzige Option (Pilot)", async ({
    page,
  }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.assertVisible();

    // Magic-Link-Button ist sichtbar, Passwort-Feld und -Link NICHT (PILOT_HIDE_PASSWORD_LOGIN)
    await expect(loginPage.sendMagicLinkButton).toBeVisible();
    await expect(loginPage.passwordInput).not.toBeVisible();
    await expect(loginPage.switchToPasswordLink).not.toBeVisible();
  });

  test("S1.7 — Login: E-Mail-Feld und Magic-Link-Button funktionieren", async ({
    page,
  }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    // E-Mail eingeben und pruefen
    await loginPage.emailInput.fill("test@example.com");
    await expect(loginPage.emailInput).toHaveValue("test@example.com");

    // Magic-Link-Button ist klickbar
    await expect(loginPage.sendMagicLinkButton).toBeEnabled();
  });

  test("S1.8 — Login: Registrierungs-Link vorhanden", async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    // Register-Link ist sichtbar
    await expect(loginPage.registerLink).toBeVisible();
  });

  test("S1.9 — Navigation Login <-> Registrierung", async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("networkidle");
    await page.getByRole("link", { name: "Jetzt registrieren" }).click();
    await expect(page).toHaveURL(/\/register/);

    await page.getByRole("link", { name: "Jetzt anmelden" }).click();
    await expect(page).toHaveURL(/\/login/);
  });
});
