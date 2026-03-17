import { test, expect } from "@playwright/test";

test.describe("Kiosk Videochat", () => {
  // Terminal-Route existiert (ohne gueltiges Token wird Fehler angezeigt)
  test("Terminal-Route antwortet", async ({ request }) => {
    const response = await request.get("/terminal/test-token");
    // Entweder 200 (gerendert) oder 404 (ungültiges Token)
    expect([200, 404]).toContain(response.status());
  });

  test("Device-Contacts API gibt 401 ohne Token", async ({ request }) => {
    const response = await request.get("/api/device/contacts");
    expect(response.status()).toBe(401);
  });

  test("Caregiver Auto-Answer API gibt 401 ohne Auth", async ({ request }) => {
    const response = await request.get("/api/caregiver/auto-answer?linkId=test");
    expect(response.status()).toBe(401);
  });

  test("Caregiver Auto-Answer PATCH gibt 401 ohne Auth", async ({ request }) => {
    const response = await request.patch("/api/caregiver/auto-answer", {
      data: { linkId: "test", autoAnswerAllowed: true },
    });
    expect(response.status()).toBe(401);
  });
});
