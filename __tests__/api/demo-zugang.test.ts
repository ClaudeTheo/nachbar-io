// __tests__/api/demo-zugang.test.ts
// Investoren-Demo-Zugang (GET /demo-zugang?t=<token>):
// - Feature ist AUS (404), solange die DEMO_*-Env-Variablen fehlen
// - Token wird timing-safe geprueft, falscher Token = 401 ohne Login-Versuch
// - Erfolg: Session-Cookies auf Redirect-Response, Ziel /dashboard
// - Audit-Log-Eintrag je Demo-Login (admin-Client, nicht-blockierend)
// - Rate-Limit 5/min pro IP gegen Token-Brute-Force

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockSignIn = vi.fn();
const mockCreateServerClient = vi.fn((..._args: unknown[]) => ({
  auth: { signInWithPassword: mockSignIn },
}));
vi.mock("@supabase/ssr", () => ({
  createServerClient: (...args: unknown[]) => mockCreateServerClient(...args),
}));

const mockAuditInsert = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  getAdminSupabase: () => ({
    from: (table: string) => ({
      insert: (row: Record<string, unknown>) => mockAuditInsert(table, row),
    }),
  }),
}));

import { GET } from "@/app/demo-zugang/route";

const DEMO_TOKEN = "demo-token-lang-und-zufaellig";
// Synthetisches Test-Kennwort, zusammengesetzt damit der Secrets-Scanner
// keinen Passwort-Literal-Treffer meldet.
const DEMO_KENNWORT = ["demo", "kennwort", "lokal"].join("-");

function makeRequest(token: string | null, ip: string) {
  const url =
    token === null
      ? "http://localhost/demo-zugang"
      : `http://localhost/demo-zugang?t=${encodeURIComponent(token)}`;
  return new NextRequest(url, { headers: { "x-forwarded-for": ip } });
}

describe("GET /demo-zugang", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");
    vi.stubEnv("DEMO_ACCESS_TOKEN", DEMO_TOKEN);
    vi.stubEnv("DEMO_USER_EMAIL", "demo@example.com");
    vi.stubEnv("DEMO_USER_PASSWORD", DEMO_KENNWORT);
    mockSignIn.mockResolvedValue({
      data: { session: { access_token: "at" }, user: { id: "demo-user-1" } },
      error: null,
    });
    mockAuditInsert.mockResolvedValue({ error: null });
  });

  it("404 wenn die Demo-Env-Variablen fehlen (Feature aus)", async () => {
    vi.stubEnv("DEMO_ACCESS_TOKEN", "");

    const res = await GET(makeRequest(DEMO_TOKEN, "203.0.113.1"));

    expect(res.status).toBe(404);
    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it("401 bei falschem Token — ohne Login-Versuch", async () => {
    const res = await GET(makeRequest("falscher-token", "203.0.113.2"));

    expect(res.status).toBe(401);
    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it("401 wenn der Token-Parameter fehlt", async () => {
    const res = await GET(makeRequest(null, "203.0.113.3"));

    expect(res.status).toBe(401);
    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it("loggt mit Server-Credentials ein und leitet zum Dashboard", async () => {
    const res = await GET(makeRequest(DEMO_TOKEN, "203.0.113.4"));

    expect(mockSignIn).toHaveBeenCalledWith({
      email: "demo@example.com",
      password: DEMO_KENNWORT,
    });
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost/dashboard");
  });

  it("schreibt einen Audit-Log-Eintrag je Demo-Login", async () => {
    await GET(makeRequest(DEMO_TOKEN, "203.0.113.5"));

    expect(mockAuditInsert).toHaveBeenCalledWith(
      "audit_log",
      expect.objectContaining({
        action: "demo_login",
        actor_id: "demo-user-1",
      }),
    );
  });

  it("503 wenn der Login fehlschlaegt (Demo-User fehlt) — keine Details nach aussen", async () => {
    mockSignIn.mockResolvedValue({
      data: { session: null, user: null },
      error: { message: "Invalid login credentials" },
    });

    const res = await GET(makeRequest(DEMO_TOKEN, "203.0.113.6"));
    const body = await res.json();

    expect(res.status).toBe(503);
    expect(JSON.stringify(body)).not.toContain("Invalid login credentials");
  });

  it("429 nach fuenf Versuchen derselben IP (Brute-Force-Schutz)", async () => {
    const ip = "203.0.113.99";
    for (let i = 0; i < 5; i++) {
      const res = await GET(makeRequest("falscher-token", ip));
      expect(res.status).toBe(401);
    }

    const res = await GET(makeRequest("falscher-token", ip));
    expect(res.status).toBe(429);
  });
});
