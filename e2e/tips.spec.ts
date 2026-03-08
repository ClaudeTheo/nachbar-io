import { test, expect } from "@playwright/test";

test.describe("Nachbarschafts-Tipps", () => {
  test("Tipps-Route existiert und antwortet", async ({ request }) => {
    const response = await request.get("/tips");
    // Entweder 200 oder Redirect (Auth)
    expect([200, 302, 307]).toContain(response.status());
  });

  test("Tipps-Seite laed nach Auth-Redirect", async ({ page }) => {
    await page.goto("/tips");
    // Nicht-authentifiziert → Login-Redirect
    await page.waitForTimeout(3000);
    const url = page.url();
    expect(url).toMatch(/\/(login|tips)/);
  });

  test("Neuer-Tipp-Route existiert", async ({ request }) => {
    const response = await request.get("/tips/new");
    expect([200, 302, 307]).toContain(response.status());
  });

  test("Tipp-Detail-Route antwortet", async ({ request }) => {
    const response = await request.get("/tips/00000000-0000-0000-0000-000000000000");
    expect([200, 302, 307]).toContain(response.status());
  });
});

test.describe("Hilfe-Unterkategorien", () => {
  test("Hilfe-Boerse-Route existiert", async ({ request }) => {
    const response = await request.get("/help");
    expect([200, 302, 307]).toContain(response.status());
  });

  test("Neue-Hilfe-Route existiert", async ({ request }) => {
    const response = await request.get("/help/new");
    expect([200, 302, 307]).toContain(response.status());
  });

  test("Hilfe-Detail-Route antwortet", async ({ request }) => {
    const response = await request.get("/help/00000000-0000-0000-0000-000000000000");
    expect([200, 302, 307]).toContain(response.status());
  });
});

test.describe("Dashboard Tipps-Integration", () => {
  test("Landing-Page laed ohne Fehler", async ({ page }) => {
    const response = await page.goto("/");
    // HTTP-Status sollte 200 sein (kein 500 Server Error)
    expect(response?.status()).toBe(200);
  });
});
