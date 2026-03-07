import { test, expect } from "@playwright/test";

test.describe("API-Endpunkte", () => {
  test("GET /api/alerts gibt JSON zurück", async ({ request }) => {
    const response = await request.get("/api/alerts");
    // Ohne Auth sollte es entweder 200 (leere Liste) oder 401 sein
    expect([200, 401]).toContain(response.status());

    if (response.status() === 200) {
      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
    }
  });

  test("POST /api/alerts erfordert Authentifizierung", async ({ request }) => {
    const response = await request.post("/api/alerts", {
      data: { category: "test", title: "Test" },
    });
    expect(response.status()).toBe(401);
  });

  test("POST /api/push/send erfordert Authentifizierung", async ({ request }) => {
    const response = await request.post("/api/push/send", {
      data: { title: "Test" },
    });
    expect(response.status()).toBe(401);
  });
});
