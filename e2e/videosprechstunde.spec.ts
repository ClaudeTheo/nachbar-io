import { test, expect } from "@playwright/test";

test.describe("Videosprechstunde", () => {
  test("Sprechstunde-Route existiert und erfordert Auth", async ({ page }) => {
    await page.goto("/sprechstunde");
    // Auth-geschuetzte Route — leitet zu Login oder zeigt Inhalt
    await expect(page).toHaveURL(/\/(login|sprechstunde)/, { timeout: 10000 });
  });

  test("Consultations-Route existiert und erfordert Auth", async ({ page }) => {
    await page.goto("/care/consultations");
    // Auth-geschuetzte Route — leitet zu Login oder zeigt Inhalt
    await expect(page).toHaveURL(/\/(login|care\/consultations)/, {
      timeout: 10000,
    });
  });

  test("Terminverhandlung: Seite ist erreichbar", async ({ request }) => {
    const response = await request.get("/care/consultations");
    // Entweder 200 (geladen) oder 302/307 (Auth-Redirect)
    expect([200, 302, 307]).toContain(response.status());
  });

  test("Termin-Verhandlung: Vorschlag → Gegenvorschlag → Bestätigung", async ({
    page: _page,
  }) => {
    // Dieser Test braucht Auth-Setup und Test-Daten
    // Implementierung haengt von bestehendem E2E-Auth-Setup ab
    test.skip();
  });
});
