import { test, expect } from "@playwright/test";

// Hinweis: Alle /hilfe-Routen liegen unter app/(app)/ und erfordern Authentifizierung.
// Nicht eingeloggte Nutzer werden von der Middleware zu /login umgeleitet.
// Diese Tests prüfen daher die Redirect-Logik und die API-Endpunkte.

test.describe("Nachbar Hilfe", () => {
  test("Hilfe-Seite leitet zu /login um (Auth erforderlich)", async ({
    page,
  }) => {
    await page.goto("/hilfe");
    await page.waitForURL("**/login", { timeout: 10000 });
    expect(page.url()).toContain("/login");
  });

  test("Pflege-Profil leitet zu /login um", async ({ page }) => {
    await page.goto("/hilfe/profil");
    await page.waitForURL("**/login", { timeout: 10000 });
    expect(page.url()).toContain("/login");
  });

  test("Helfer-Registrierung leitet zu /login um", async ({ page }) => {
    await page.goto("/hilfe/helfer-werden");
    await page.waitForURL("**/login", { timeout: 10000 });
    expect(page.url()).toContain("/login");
  });

  test("Neues Gesuch leitet zu /login um", async ({ page }) => {
    await page.goto("/hilfe/neu");
    await page.waitForURL("**/login", { timeout: 10000 });
    expect(page.url()).toContain("/login");
  });

  test("Budget-Tracker leitet zu /login um", async ({ page }) => {
    await page.goto("/hilfe/budget");
    await page.waitForURL("**/login", { timeout: 10000 });
    expect(page.url()).toContain("/login");
  });

  test("Verbindungen-Seite leitet zu /login um", async ({ page }) => {
    await page.goto("/hilfe/verbindungen");
    await page.waitForURL("**/login", { timeout: 10000 });
    expect(page.url()).toContain("/login");
  });

  test("Abo-Seite leitet zu /login um", async ({ page }) => {
    await page.goto("/hilfe/abo");
    await page.waitForURL("**/login", { timeout: 10000 });
    expect(page.url()).toContain("/login");
  });

  test("Anleitung Senior leitet zu /login um", async ({ page }) => {
    await page.goto("/hilfe/anleitung/senior");
    await page.waitForURL("**/login", { timeout: 10000 });
    expect(page.url()).toContain("/login");
  });

  test("Anleitung Helfer leitet zu /login um", async ({ page }) => {
    await page.goto("/hilfe/anleitung/helfer");
    await page.waitForURL("**/login", { timeout: 10000 });
    expect(page.url()).toContain("/login");
  });

  test("Bundesland-Detail BW leitet zu /login um", async ({ page }) => {
    await page.goto("/hilfe/anleitung/bundesland/BW");
    await page.waitForURL("**/login", { timeout: 10000 });
    expect(page.url()).toContain("/login");
  });

  test("Bundesland-Detail BY leitet zu /login um", async ({ page }) => {
    await page.goto("/hilfe/anleitung/bundesland/BY");
    await page.waitForURL("**/login", { timeout: 10000 });
    expect(page.url()).toContain("/login");
  });

  test("Bundesland-Detail NW leitet zu /login um", async ({ page }) => {
    await page.goto("/hilfe/anleitung/bundesland/NW");
    await page.waitForURL("**/login", { timeout: 10000 });
    expect(page.url()).toContain("/login");
  });

  test("Bundesland HB leitet zu /login um", async ({ page }) => {
    await page.goto("/hilfe/anleitung/bundesland/HB");
    await page.waitForURL("**/login", { timeout: 10000 });
    expect(page.url()).toContain("/login");
  });

  test("API /api/hilfe/federal-states gibt Array", async ({ request }) => {
    const res = await request.get("/api/hilfe/federal-states");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThanOrEqual(3);
  });
});
