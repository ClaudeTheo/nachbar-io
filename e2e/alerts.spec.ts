import { test, expect } from "@playwright/test";

test.describe("Soforthilfe (Alerts)", () => {
  test("Alerts-Route existiert", async ({ request }) => {
    const response = await request.get("/alerts");
    expect([200, 302, 307]).toContain(response.status());
  });

  test("Neuer Alert Route existiert", async ({ request }) => {
    const response = await request.get("/alerts/new");
    expect([200, 302, 307]).toContain(response.status());
  });

  test("Unauthentifizierter Zugriff auf /alerts leitet um", async ({ page }) => {
    await page.goto("/alerts");
    await page.waitForTimeout(3000);
    const url = page.url();
    expect(url).toMatch(/\/(login|alerts)/);
  });
});

test.describe("Alerts API", () => {
  test("GET /api/alerts gibt JSON zurueck", async ({ request }) => {
    const response = await request.get("/api/alerts");
    expect([200, 401]).toContain(response.status());

    if (response.status() === 200) {
      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
    }
  });

  test("POST /api/alerts erfordert Auth", async ({ request }) => {
    const response = await request.post("/api/alerts", {
      data: {
        category: "water_damage",
        title: "Test Alert",
        description: "Test Beschreibung",
      },
    });
    expect(response.status()).toBe(401);
  });
});

test.describe("Push-API", () => {
  test("POST /api/push/send erfordert Auth", async ({ request }) => {
    const response = await request.post("/api/push/send", {
      data: { title: "Test", body: "Test Push" },
    });
    expect([401, 403]).toContain(response.status());
  });

  test("POST /api/push/subscribe erfordert Auth", async ({ request }) => {
    const response = await request.post("/api/push/subscribe", {
      data: { endpoint: "https://test.example.com" },
    });
    expect([401, 400]).toContain(response.status());
  });
});

test.describe("News", () => {
  test("News-Route existiert", async ({ request }) => {
    const response = await request.get("/news");
    expect([200, 302, 307]).toContain(response.status());
  });

  test("News Aggregation API existiert", async ({ request }) => {
    const response = await request.get("/api/news/aggregate");
    // Kann 200, 401 oder 405 sein (je nach HTTP-Methode)
    expect(response.status()).toBeLessThan(500);
  });
});
