// Nachbar.io — Tests fuer GET /api/admin/households
// Verifiziert: Auth-Gate (401/403), RLS-bestimmte Sichtbarkeit via SSR-Client,
// invite_code-Anreicherung NUR via Service-Role (nicht ueber den Browser-/SSR-Client)
// und nur fuer die schon sichtbaren IDs (kein IDOR), memberCount, Array-Antwortform.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createClient } from "@/lib/supabase/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { GET } from "./route";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ getAdminSupabase: vi.fn() }));

interface SsrOpts {
  user: { id: string } | null;
  isAdmin?: boolean;
  households?: Array<Record<string, unknown> & { id: string }>;
  members?: Array<{ household_id: string }>;
}

// Erfasst die household_members-`in`-Argumente fuer die IDOR-Pruefung.
let memberInArgs: unknown[] | null = null;

function makeSsr(opts: SsrOpts) {
  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: opts.user } }) },
    from: vi.fn((table: string) => {
      if (table === "users") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi
                .fn()
                .mockResolvedValue({ data: { is_admin: opts.isAdmin ?? false } }),
            }),
          }),
        };
      }
      if (table === "households") {
        return {
          select: vi.fn().mockReturnValue({
            order: vi
              .fn()
              .mockResolvedValue({ data: opts.households ?? [], error: null }),
          }),
        };
      }
      if (table === "household_members") {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn((_col: string, ids: unknown[]) => {
              memberInArgs = ids;
              return Promise.resolve({ data: opts.members ?? [] });
            }),
          }),
        };
      }
      return {};
    }),
  };
}

// Erfasst die households-`in`-Argumente (Service-Role invite_code-Lookup).
let adminInArgs: unknown[] | null = null;

function makeAdmin(codes: Array<{ id: string; invite_code: string }>) {
  return {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnValue({
        in: vi.fn((_col: string, ids: unknown[]) => {
          adminInArgs = ids;
          return Promise.resolve({ data: codes, error: null });
        }),
      }),
    })),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  memberInArgs = null;
  adminInArgs = null;
});

describe("GET /api/admin/households", () => {
  it("gibt 401 zurueck ohne Authentifizierung", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSsr({ user: null }) as never,
    );

    const res = await GET();
    expect(res.status).toBe(401);
    expect(getAdminSupabase).not.toHaveBeenCalled();
  });

  it("gibt 403 zurueck fuer Nicht-Admins", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSsr({ user: { id: "u-1" }, isAdmin: false }) as never,
    );

    const res = await GET();
    expect(res.status).toBe(403);
    expect(getAdminSupabase).not.toHaveBeenCalled();
  });

  it("reichert invite_code via Service-Role an und zaehlt Mitglieder", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSsr({
        user: { id: "admin-1" },
        isAdmin: true,
        // SSR-Client liefert KEINEN invite_code (Spaltenschutz)
        households: [
          { id: "h1", street_name: "Purkersdorfer", house_number: "35" },
          { id: "h2", street_name: "Sanary", house_number: "2" },
        ],
        members: [
          { household_id: "h1" },
          { household_id: "h1" },
          { household_id: "h2" },
        ],
      }) as never,
    );
    vi.mocked(getAdminSupabase).mockReturnValue(
      makeAdmin([
        { id: "h1", invite_code: "PILOT-AAA" },
        { id: "h2", invite_code: "PILOT-BBB" },
      ]) as never,
    );

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();

    // Array-Form (CLAUDE.md: nie { items: [...] })
    expect(Array.isArray(body)).toBe(true);
    expect(body).toHaveLength(2);

    const h1 = body.find((h: { id: string }) => h.id === "h1");
    expect(h1.invite_code).toBe("PILOT-AAA");
    expect(h1.memberCount).toBe(2);
    const h2 = body.find((h: { id: string }) => h.id === "h2");
    expect(h2.invite_code).toBe("PILOT-BBB");
    expect(h2.memberCount).toBe(1);

    // invite_code-Lookup nur fuer die sichtbaren IDs (kein IDOR)
    expect(adminInArgs).toEqual(["h1", "h2"]);
    expect(memberInArgs).toEqual(["h1", "h2"]);
  });

  it("gibt leeres Array zurueck ohne sichtbare Haushalte (kein Service-Role-Call)", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSsr({ user: { id: "admin-1" }, isAdmin: true, households: [] }) as never,
    );

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual([]);
    // Ohne sichtbare IDs darf kein invite_code-Lookup passieren
    expect(getAdminSupabase).not.toHaveBeenCalled();
  });
});
