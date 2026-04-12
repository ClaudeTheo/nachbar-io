// app/api/sos/notify-family/route.test.ts
// Nachbar.io — API-Route-Tests für SOS-Familienbenachrichtigung (POST)

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// --- Mocks VOR Imports definieren ---

const mockGetUser = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockImplementation(() =>
    Promise.resolve({
      auth: { getUser: mockGetUser },
    }),
  ),
}));

const mockNotifyFamily = vi.fn();

vi.mock("@/lib/sos/notify-family", () => ({
  notifyFamily: (...args: unknown[]) => mockNotifyFamily(...args),
}));

import { POST } from "./route";

// --- Helpers ---

function createPostRequest(): NextRequest {
  return new NextRequest("http://localhost:3000/api/sos/notify-family", {
    method: "POST",
  });
}

const TEST_USER = { id: "user-senior-1", email: "senior@test.de" };

// --- Tests ---

describe("POST /api/sos/notify-family", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: TEST_USER } });
    mockNotifyFamily.mockResolvedValue({ notified: 2, failed: 0 });
  });

  it("gibt 401 zurück ohne authentifizierten User", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });

    const response = await POST(createPostRequest());
    expect(response.status).toBe(401);

    const body = await response.json();
    expect(body.error).toContain("authentifiziert");
  });

  it("gibt 200 mit notified-Anzahl bei Erfolg zurück", async () => {
    mockNotifyFamily.mockResolvedValueOnce({ notified: 3, failed: 1 });

    const response = await POST(createPostRequest());
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.notified).toBe(3);
    expect(body.failed).toBe(1);
  });

  it("gibt 500 zurück bei Service-Fehler", async () => {
    mockNotifyFamily.mockRejectedValueOnce(new Error("SMS gateway down"));

    const response = await POST(createPostRequest());
    expect(response.status).toBe(500);

    const body = await response.json();
    expect(body.error).toBe("Benachrichtigung fehlgeschlagen");
  });
});
