// __tests__/api/test-login.test.ts
// Sicherheitskritisch: /api/test/login darf nie in Production/Preview aktiv sein.

import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

const mockSignInWithPassword = vi.fn();

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(() => ({
    auth: { signInWithPassword: mockSignInWithPassword },
  })),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { signInWithPassword: mockSignInWithPassword },
  })),
}));

function buildGetRequest(next: string) {
  const url = new URL("http://localhost/api/test/login");
  url.searchParams.set("email", "senior@example.test");
  url.searchParams.set("password", "secret-password");
  url.searchParams.set("secret", "e2e-secret");
  url.searchParams.set("next", next);
  return new NextRequest(url);
}

function buildPostRequest() {
  return new NextRequest("http://localhost/api/test/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      email: "senior@example.test",
      password: "secret-password",
      secret: "e2e-secret",
    }),
  });
}

describe("/api/test/login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    vi.resetModules();
    vi.stubEnv("E2E_TEST_SECRET", "e2e-secret");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");
    mockSignInWithPassword.mockResolvedValue({
      data: {
        session: { access_token: "access-token" },
        user: { id: "user-1", user_metadata: { ui_mode: "active" } },
      },
      error: null,
    });
  });

  it("gibt in NODE_ENV=production immer 404 fuer GET zurueck", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const { GET } = await import("@/app/api/test/login/route");

    const res = await GET(buildGetRequest("/dashboard"));

    expect(res.status).toBe(404);
    expect(mockSignInWithPassword).not.toHaveBeenCalled();
  });

  it("gibt in Vercel Preview immer 404 fuer POST zurueck", async () => {
    vi.stubEnv("NEXT_PUBLIC_VERCEL_ENV", "preview");
    const { POST } = await import("@/app/api/test/login/route");

    const res = await POST(buildPostRequest());

    expect(res.status).toBe(404);
    expect(mockSignInWithPassword).not.toHaveBeenCalled();
  });

  it("leitet bei externem next-Parameter nicht auf externe URLs weiter", async () => {
    const { GET } = await import("@/app/api/test/login/route");

    const res = await GET(buildGetRequest("https://evil.example/phish"));

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost/dashboard");
  });
});
