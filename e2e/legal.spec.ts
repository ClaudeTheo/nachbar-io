import { test, expect } from "@playwright/test";

test.describe("Datenschutzerklaerung", () => {
  test("Datenschutz-Seite laed korrekt", async ({ page }) => {
    await page.goto("/datenschutz");
    // Seite nutzt echte Umlaute: Datenschutzerklärung
    await expect(
      page.getByRole("heading", { name: /Datenschutzerkl/i }),
    ).toBeVisible({ timeout: 10000 });
  });

  test("Datenschutz hat Verantwortlichen-Sektion", async ({ page }) => {
    await page.goto("/datenschutz");
    await expect(page.getByText("1. Verantwortlicher")).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByText("Thomas Theobald")).toBeVisible();
    // Datenschutz nutzt echte Umlaute (Straße, Säckingen)
    await expect(page.getByText(/Purkersdorfer Stra/)).toBeVisible();
    await expect(page.getByText(/Bad S.ckingen/).first()).toBeVisible();
  });

  test("Datenschutz hat Kernsektionen", async ({ page }) => {
    await page.goto("/datenschutz");
    // 17 Sektionen, hier die wichtigsten pruefen
    await expect(page.getByText("1. Verantwortlicher")).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByText(/Geltungsbereich/)).toBeVisible();
    await expect(page.getByText(/Rechtsgrundlagen/)).toBeVisible();
    await expect(page.getByText(/Welche Daten wir erheben/)).toBeVisible();
    await expect(
      page.getByText(/Cookies und lokale Speicherung/),
    ).toBeVisible();
    await expect(page.getByText(/Ihre Rechte/)).toBeVisible();
    await expect(page.getByText(/Datensicherheit/)).toBeVisible();
    await expect(page.getByText(/Beschwerderecht/)).toBeVisible();
    await expect(page.getByText(/nderungen dieser Erkl/)).toBeVisible();
  });

  test("Datenschutz erwaehnt DSGVO-Rechtsgrundlagen", async ({ page }) => {
    await page.goto("/datenschutz");
    await expect(
      page.getByText(/Art\. 6 Abs\. 1 lit\. b DSGVO/).first(),
    ).toBeVisible({
      timeout: 10000,
    });
    await expect(
      page.getByText(/Art\. 6 Abs\. 1 lit\. f DSGVO/).first(),
    ).toBeVisible();
    await expect(
      page.getByText(/Art\. 6 Abs\. 1 lit\. a DSGVO/).first(),
    ).toBeVisible();
  });

  test("Datenschutz erwaehnt Drittanbieter", async ({ page }) => {
    await page.goto("/datenschutz");
    await expect(page.getByText(/Supabase/).first()).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByText(/Vercel/).first()).toBeVisible();
    await expect(page.getByText(/Anthropic/).first()).toBeVisible();
  });

  test("Datenschutz erwaehnt kein Google Analytics", async ({ page }) => {
    await page.goto("/datenschutz");
    await expect(page.getByText(/kein Google Analytics/)).toBeVisible({
      timeout: 10000,
    });
  });

  test("Datenschutz hat Zurueck-Link", async ({ page }) => {
    await page.goto("/datenschutz");
    // Link-Text nutzt echten Umlaut: Zurück
    const backLink = page.getByRole("link", { name: /Zur.ck/ });
    await expect(backLink).toBeVisible({ timeout: 10000 });
    await expect(backLink).toHaveAttribute("href", "/");
  });

  test("Datenschutz hat Footer-Links", async ({ page }) => {
    await page.goto("/datenschutz");
    await expect(page.getByRole("link", { name: "Impressum" })).toBeVisible({
      timeout: 10000,
    });
  });
});

test.describe("Impressum", () => {
  test("Impressum-Seite laed korrekt", async ({ page }) => {
    await page.goto("/impressum");
    await expect(page.getByRole("heading", { name: "Impressum" })).toBeVisible({
      timeout: 10000,
    });
  });

  test("Impressum hat Pflichtangaben gemäß § 5 TMG", async ({ page }) => {
    await page.goto("/impressum");
    await expect(page.getByText("Angaben gemäß § 5 TMG")).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByText("Thomas Theobald").first()).toBeVisible();
    await expect(
      page.getByText("Purkersdorfer Straße 35").first(),
    ).toBeVisible();
    await expect(page.getByText("79713 Bad Säckingen").first()).toBeVisible();
    await expect(page.getByText("Deutschland")).toBeVisible();
  });

  test("Impressum hat Kontakt-Sektion", async ({ page }) => {
    await page.goto("/impressum");
    await expect(page.getByText("Kontakt")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/E-Mail:/)).toBeVisible();
  });

  test("Impressum hat Inhalt-Verantwortlichen", async ({ page }) => {
    await page.goto("/impressum");
    await expect(page.getByText(/Verantwortlich für den Inhalt/)).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByText(/§ 18 Abs\. 2 MStV/)).toBeVisible();
  });

  test("Impressum hat EU-Streitschlichtung", async ({ page }) => {
    await page.goto("/impressum");
    await expect(page.getByText("EU-Streitschlichtung")).toBeVisible({
      timeout: 10000,
    });
    const odrLink = page.getByRole("link", { name: /ec\.europa\.eu/ });
    await expect(odrLink).toBeVisible();
    await expect(odrLink).toHaveAttribute(
      "href",
      "https://ec.europa.eu/consumers/odr/",
    );
  });

  test("Impressum hat Haftungsausschluss", async ({ page }) => {
    await page.goto("/impressum");
    await expect(page.getByText("Haftung für Inhalte")).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByText("Haftung für Links")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Urheberrecht" }),
    ).toBeVisible();
  });

  test("Impressum hat Plattform-Hinweis (nichtkommerziell)", async ({
    page,
  }) => {
    await page.goto("/impressum");
    await expect(page.getByText("Hinweis zur Plattform")).toBeVisible({
      timeout: 10000,
    });
    await expect(
      page.getByText(/nichtkommerzielles Community-Projekt/),
    ).toBeVisible();
  });

  test("Impressum hat Zurück-Link", async ({ page }) => {
    await page.goto("/impressum");
    const backLink = page.getByRole("link", { name: "Zurück" });
    await expect(backLink).toBeVisible({ timeout: 10000 });
    await expect(backLink).toHaveAttribute("href", "/");
  });

  test("Impressum hat Footer-Links", async ({ page }) => {
    await page.goto("/impressum");
    await expect(page.getByRole("link", { name: "Datenschutz" })).toBeVisible({
      timeout: 10000,
    });
  });
});

test.describe("Rechtliche Links auf Landing-Page", () => {
  test("Landing-Page hat Impressum-Link", async ({ page }) => {
    await page.goto("/");
    const impressumLink = page.getByRole("link", { name: "Impressum" });
    await expect(impressumLink).toBeVisible({ timeout: 10000 });
    await expect(impressumLink).toHaveAttribute("href", "/impressum");
  });

  test("Landing-Page hat Datenschutz-Link", async ({ page }) => {
    await page.goto("/");
    const datenschutzLink = page.getByRole("link", { name: "Datenschutz" });
    await expect(datenschutzLink).toBeVisible({ timeout: 10000 });
    await expect(datenschutzLink).toHaveAttribute("href", "/datenschutz");
  });

  test("Impressum-Link navigiert korrekt", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Impressum" }).click();
    await expect(page).toHaveURL(/\/impressum/);
    await expect(page.getByRole("heading", { name: "Impressum" })).toBeVisible({
      timeout: 10000,
    });
  });

  test("Datenschutz-Link existiert und Zielseite laed", async ({ page }) => {
    // Link auf Landing-Page pruefen
    await page.goto("/");
    const dsLink = page.locator('a[href="/datenschutz"]');
    await expect(dsLink).toBeVisible({ timeout: 10000 });
    await expect(dsLink).toHaveAttribute("href", "/datenschutz");

    // Zielseite direkt laden und pruefen
    await page.goto("/datenschutz");
    await expect(
      page.getByRole("heading", { name: /Datenschutzerkl/i }),
    ).toBeVisible({ timeout: 10000 });
  });
});
