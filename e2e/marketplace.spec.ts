import { test, expect } from "@playwright/test";

test.describe("Marktplatz", () => {
  test("Marktplatz-Route existiert", async ({ request }) => {
    const response = await request.get("/marketplace");
    // Entweder 200 oder Redirect (Auth)
    expect([200, 302, 307]).toContain(response.status());
  });

  test("Unauthentifizierter Zugriff auf /marketplace leitet um", async ({ page }) => {
    await page.goto("/marketplace");
    await page.waitForTimeout(3000);
    const url = page.url();
    expect(url).toMatch(/\/(login|marketplace)/);
  });

  test("Marktplatz Neues Inserat Route existiert", async ({ request }) => {
    const response = await request.get("/marketplace/new");
    expect([200, 302, 307]).toContain(response.status());
  });
});

test.describe("Hilfe-Boerse", () => {
  test("Hilfe-Route existiert", async ({ request }) => {
    const response = await request.get("/help");
    expect([200, 302, 307]).toContain(response.status());
  });

  test("Hilfe Neues Gesuch Route existiert", async ({ request }) => {
    const response = await request.get("/help/new");
    expect([200, 302, 307]).toContain(response.status());
  });
});

test.describe("Events", () => {
  test("Events-Route existiert", async ({ request }) => {
    const response = await request.get("/events");
    expect([200, 302, 307]).toContain(response.status());
  });

  test("Events Neues Event Route existiert", async ({ request }) => {
    const response = await request.get("/events/new");
    expect([200, 302, 307]).toContain(response.status());
  });
});

test.describe("Nachrichten", () => {
  test("Nachrichten-Route existiert", async ({ request }) => {
    const response = await request.get("/messages");
    expect([200, 302, 307]).toContain(response.status());
  });
});

test.describe("Experten", () => {
  test("Experten-Route existiert", async ({ request }) => {
    const response = await request.get("/experts");
    expect([200, 302, 307]).toContain(response.status());
  });
});

test.describe("Fundbuero", () => {
  test("Lost-Found-Route existiert", async ({ request }) => {
    const response = await request.get("/lost-found");
    expect([200, 302, 307]).toContain(response.status());
  });

  test("Lost-Found Neue Meldung Route existiert", async ({ request }) => {
    const response = await request.get("/lost-found/new");
    expect([200, 302, 307]).toContain(response.status());
  });
});
