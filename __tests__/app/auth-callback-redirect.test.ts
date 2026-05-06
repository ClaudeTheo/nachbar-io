// __tests__/app/auth-callback-redirect.test.ts
// Regressionsschutz: Magic-Link-Callback darf nie zu externem `next` leiten.

import { describe, it, expect, beforeEach, vi } from "vitest";

const mockExchangeCodeForSession = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { exchangeCodeForSession: mockExchangeCodeForSession },
  })),
}));

function buildCallbackRequest(next: string | null, code = "magic-code") {
  const url = new URL("http://localhost/auth/callback");
  url.searchParams.set("code", code);
  if (next !== null) url.searchParams.set("next", next);
  return new Request(url);
}

describe("/auth/callback redirect safety", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExchangeCodeForSession.mockResolvedValue({ error: null });
  });

  it("leitet valide In-App-Pfade nach erfolgreichem Code-Exchange weiter", async () => {
    const { GET } = await import("@/app/auth/callback/route");

    const res = await GET(buildCallbackRequest("/senior/home?from=magic"));

    expect(mockExchangeCodeForSession).toHaveBeenCalledWith("magic-code");
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe(
      "http://localhost/senior/home?from=magic",
    );
  });

  it.each([
    "//evil.example/phish",
    "https://evil.example/phish",
    "http://evil.example/phish",
    "javascript:alert(1)",
    "/\\evil.example/phish",
    "dashboard",
  ])("faellt fuer unsicheren next=%s auf /after-login zurueck", async (next) => {
    const { GET } = await import("@/app/auth/callback/route");

    const res = await GET(buildCallbackRequest(next));

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost/after-login");
  });
});
