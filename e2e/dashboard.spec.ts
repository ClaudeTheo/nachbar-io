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
    await expect(page.getByText("QuartierApp").first()).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByText("Pilot: Bad Säckingen")).toBeVisible();
    await expect(page.getByText(/Dorfplatz/i).first()).toBeVisible();
  });

  test("Landing-Page zeigt Quartier-Hinweis", async ({ page }) => {
    await page.goto("/");
    // Landing-Page CTA: "Werden Sie Teil Ihres Quartiers" + "Kostenlos für alle Bewohner"
    await expect(page.getByText(/Werden Sie Teil Ihres Quartiers/)).toBeVisible(
      { timeout: 10000 },
    );
    await expect(
      page.getByText(/Kostenlos für alle Bewohner/i).first(),
    ).toBeVisible();
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
