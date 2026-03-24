import { test, expect } from "@playwright/test";

test.describe("Dashboard", () => {
  // Dashboard erfordert Auth — unauthentifizierte Nutzer werden umgeleitet
  test("Unauthentifizierter Zugriff leitet zum Login", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/, { timeout: 15000 });
  });

  test("Dashboard-Route existiert und antwortet", async ({ request }) => {
    const response = await request.get("/dashboard");
    // Entweder 200 (geladen) oder 307/302 (Redirect zu Login)
    expect([200, 302, 307]).toContain(response.status());
  });
});

test.describe("Dashboard UI-Elemente (Landing Page Fallback)", () => {
  test("Landing-Page hat Quartier-Beschreibung", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("QuartierApp")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/digitaler Dorfplatz/i)).toBeVisible();
  });

  test("Landing-Page zeigt Quartier-Hinweis", async ({ page }) => {
    await page.goto("/");
    // Landing-Page hat allgemeinen Quartier-Hinweis (keine Strassen mehr)
    await expect(page.getByText(/Bewohner des Quartiers/)).toBeVisible({
      timeout: 10000,
    });
  });

  test("Landing-Page hat Navigationslinks", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: "Anmelden" })).toBeVisible({
      timeout: 10000,
    });
    await expect(
      page.getByRole("link", { name: "Registrieren" }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Impressum" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Datenschutz" })).toBeVisible();
  });
});
