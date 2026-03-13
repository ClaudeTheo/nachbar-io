// Nachbar.io — S1: Onboarding + Adress/Code-Verifikation
// Agent A registriert sich, durchlaeuft alle 4 Schritte, wird verifiziert.
import { test, expect } from "@playwright/test";
import { RegisterPage, LoginPage } from "../pages";
import { createConsoleErrorCollector } from "../helpers/observer";
import { TEST_AGENTS, TIMEOUTS } from "../helpers/test-config";

test.describe("S1: Onboarding + Verifikation", () => {
  test("S1.1 — Komplette Registrierung mit gueltigem Invite-Code", async ({ browser }) => {
    const context = await browser.newContext({ locale: "de-DE" });
    const page = await context.newPage();
    const errors = createConsoleErrorCollector(page);

    const registerPage = new RegisterPage(page);
    await registerPage.goto();

    // Schritt 1: Credentials
    await registerPage.assertOnStep(1);
    await registerPage.fillCredentials(
      TEST_AGENTS.nachbar_a.email,
      TEST_AGENTS.nachbar_a.password
    );

    // Schritt 2: Invite-Code
    await registerPage.assertOnStep(2);
    await registerPage.fillInviteCode(TEST_AGENTS.nachbar_a.inviteCode);

    // Schritt 3: Anzeigename
    await registerPage.assertOnStep(3);
    await registerPage.fillDisplayName(TEST_AGENTS.nachbar_a.displayName);

    // Schritt 4: Modus waehlen
    await registerPage.assertOnStep(4);
    await registerPage.selectModeAndComplete("active");

    // Assert: Weiterleitung zur Welcome-Tour oder Dashboard
    await page.waitForURL(/\/(welcome|dashboard)/, { timeout: TIMEOUTS.pageLoad });
    console.log("[A] Registrierung erfolgreich →", page.url());

    // Assert: Keine fatalen Konsolenfehler
    errors.stop();
    expect(errors.errors).toHaveLength(0);

    await context.close();
  });

  test("S1.2 — Registrierung mit ungueltigem Invite-Code wird abgelehnt", async ({ page }) => {
    const registerPage = new RegisterPage(page);
    await registerPage.goto();

    // Schritt 1
    await registerPage.fillCredentials("invalid@test.nachbar.local", "TestPass123!");

    // Schritt 2: Ungueltiger Code
    await registerPage.fillInviteCode("INVALID1");

    // Assert: Fehlermeldung erscheint, Schritt 2 bleibt aktiv
    await registerPage.assertInviteCodeError();
    await registerPage.assertOnStep(2);
  });

  test("S1.3 — Kurzes Passwort wird blockiert", async ({ page }) => {
    const registerPage = new RegisterPage(page);
    await registerPage.goto();

    await page.getByLabel("E-Mail-Adresse").fill("short@test.nachbar.local");
    await page.getByLabel("Passwort").fill("kurz");
    await page.getByRole("button", { name: "Weiter" }).click();

    // Assert: Bleibt auf Schritt 1 (Browser minLength oder JS-Validierung)
    await registerPage.assertOnStep(1);
  });

  test("S1.4 — Senior-Modus Registrierung fuehrt zu Senior-Home", async ({ browser }) => {
    const context = await browser.newContext({
      locale: "de-DE",
      viewport: { width: 393, height: 851 },
    });
    const page = await context.newPage();

    const registerPage = new RegisterPage(page);
    await registerPage.goto();

    await registerPage.registerFull({
      email: TEST_AGENTS.senior_s.email,
      password: TEST_AGENTS.senior_s.password,
      inviteCode: TEST_AGENTS.senior_s.inviteCode,
      displayName: TEST_AGENTS.senior_s.displayName,
      mode: "senior",
    });

    // Assert: Weiterleitung zu Senior-Home
    await expect(page).toHaveURL(/\/senior/);
    console.log("[S] Senior-Registrierung erfolgreich →", page.url());

    await context.close();
  });

  test("S1.5 — Login nach Registrierung funktioniert", async ({ browser }) => {
    const context = await browser.newContext({ locale: "de-DE" });
    const page = await context.newPage();

    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.assertVisible();

    // Mit vorher registriertem Account einloggen
    await loginPage.login(
      TEST_AGENTS.nachbar_a.email,
      TEST_AGENTS.nachbar_a.password
    );

    // Assert: Weiterleitung zum Dashboard
    await page.waitForURL(/\/(dashboard|welcome|senior)/, { timeout: TIMEOUTS.pageLoad });
    console.log("[A] Login erfolgreich →", page.url());

    await context.close();
  });

  test("S1.6 — Navigation Login <-> Registrierung", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("link", { name: "Jetzt registrieren" }).click();
    await expect(page).toHaveURL(/\/register/);

    await page.getByRole("link", { name: "Jetzt anmelden" }).click();
    await expect(page).toHaveURL(/\/login/);
  });
});
