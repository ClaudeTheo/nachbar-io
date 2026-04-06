// __tests__/api/admin/youth/overview.test.ts
// Admin Youth-Overview: KPIs, Consents, Moderation

import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Mock-Daten ---
const mockAdminUser = { id: "admin-1" };

const mockConsentsList = [
  {
    id: "yp-1",
    user_id: "u-teen-1",
    birth_year: 2012,
    age_group: "u16",
    access_level: "freigeschaltet",
    created_at: "2026-04-01T10:00:00Z",
    users: { first_name: "Lena" },
    quarters: { name: "Rebberg" },
    youth_guardian_consents: [
      {
        status: "granted",
        granted_at: "2026-04-02T10:00:00Z",
        token_send_count: 1,
        created_at: "2026-04-01T10:00:00Z",
      },
    ],
  },
  {
    id: "yp-2",
    user_id: "u-teen-2",
    birth_year: 2013,
    age_group: "u16",
    access_level: "basis",
    created_at: "2026-04-02T10:00:00Z",
    users: { first_name: "Max" },
    quarters: { name: "Sanarystrasse" },
    youth_guardian_consents: [
      {
        status: "pending",
        granted_at: null,
        token_send_count: 2,
        created_at: "2026-04-02T10:00:00Z",
      },
    ],
  },
];

// --- Helper: baut einen Mock-Supabase-Client (Auth-Pruefung) ---
function buildMockClient(opts: {
  user: { id: string } | null;
  isAdmin: boolean;
}) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: opts.user } }),
    },
    from: vi.fn((table: string) => {
      if (table === "users") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: opts.isAdmin ? { is_admin: true } : { is_admin: false },
                error: null,
              }),
            }),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      };
    }),
  };
}

// --- Helper: chainable Mock fuer Supabase-Query ---
function chainable(resolvedValue: unknown) {
  const obj: Record<string, any> = {};
  // Jede Methode gibt dasselbe chainable-Objekt zurueck,
  // am Ende wird es wie ein Promise aufgeloest.
  const methods = [
    "select",
    "eq",
    "neq",
    "gt",
    "lt",
    "order",
    "limit",
    "single",
    "maybeSingle",
  ];
  for (const m of methods) {
    obj[m] = vi.fn().mockReturnValue(obj);
  }
  // thenable: damit await funktioniert
  obj.then = vi.fn((resolve: any) => resolve(resolvedValue));
  return obj;
}

// --- Helper: Admin-Supabase-Mock ---
function buildAdminMock() {
  // Zaehlt Aufrufe pro Tabelle fuer stabile Reihenfolge
  const callCounts: Record<string, number> = {};

  return {
    from: vi.fn((table: string) => {
      callCounts[table] = (callCounts[table] ?? 0) + 1;
      const callIdx = callCounts[table];

      if (table === "youth_profiles") {
        if (callIdx === 1) {
          // Erster Aufruf: head:true Count (KPI totalProfiles)
          return chainable({ count: 2, data: null, error: null });
        }
        // Zweiter Aufruf: JOIN-Query fuer consents-Liste
        return chainable({ data: mockConsentsList, error: null });
      }

      if (table === "youth_guardian_consents") {
        // 3 Aufrufe: head:true Counts fuer pending, granted, revoked
        if (callIdx === 1) {
          return chainable({ count: 1, data: null, error: null }); // pending: 1
        }
        if (callIdx === 2) {
          return chainable({ count: 2, data: null, error: null }); // granted: 2
        }
        return chainable({ count: 0, data: null, error: null }); // revoked: 0
      }

      if (table === "youth_moderation_log") {
        if (callIdx === 1) {
          // Flagged count: select("id", { count: "exact", head: true })
          return chainable({ count: 3, data: null, error: null });
        }
        // Suspended items
        return chainable({
          data: [
            {
              id: "mod-1",
              action: "suspended",
              target_id: "post-1",
              created_at: "2026-04-05T08:00:00Z",
              details: null,
            },
          ],
          error: null,
        });
      }

      return chainable({ data: [], error: null });
    }),
  };
}

// --- Mocks ---
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  getAdminSupabase: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import { getAdminSupabase } from "@/lib/supabase/admin";

describe("GET /api/admin/youth/overview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("401 wenn nicht authentifiziert", async () => {
    vi.mocked(createClient).mockResolvedValue(
      buildMockClient({ user: null, isAdmin: false }) as any,
    );

    const { GET } = await import("@/app/api/admin/youth/overview/route");
    const res = await GET();
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Nicht autorisiert");
  });

  it("403 wenn kein Admin", async () => {
    vi.mocked(createClient).mockResolvedValue(
      buildMockClient({ user: mockAdminUser, isAdmin: false }) as any,
    );

    const { GET } = await import("@/app/api/admin/youth/overview/route");
    const res = await GET();
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe("Nur Admins");
  });

  it("200 mit korrekter Struktur fuer Admin", async () => {
    vi.mocked(createClient).mockResolvedValue(
      buildMockClient({ user: mockAdminUser, isAdmin: true }) as any,
    );
    vi.mocked(getAdminSupabase).mockReturnValue(buildAdminMock() as any);

    const { GET } = await import("@/app/api/admin/youth/overview/route");
    const res = await GET();
    expect(res.status).toBe(200);

    const body = await res.json();

    // Top-Level-Struktur
    expect(body).toHaveProperty("kpis");
    expect(body).toHaveProperty("consents");
    expect(body).toHaveProperty("moderation");

    // KPIs: Zahlen vorhanden
    expect(typeof body.kpis.totalProfiles).toBe("number");
    expect(body.kpis.totalProfiles).toBe(2);
    expect(typeof body.kpis.consentsPending).toBe("number");
    expect(body.kpis.consentsPending).toBe(1);
    expect(typeof body.kpis.consentsGranted).toBe("number");
    expect(body.kpis.consentsGranted).toBe(2);
    expect(typeof body.kpis.consentsRevoked).toBe("number");
    expect(body.kpis.consentsRevoked).toBe(0);

    // Consents: normalisiertes Array mit kanonischem Consent pro Profil
    expect(Array.isArray(body.consents)).toBe(true);
    expect(body.consents).toHaveLength(2);
    // Erstes Profil: normalisierte Felder pruefen
    expect(body.consents[0].firstName).toBe("Lena");
    expect(body.consents[0].quarterName).toBe("Rebberg");
    expect(body.consents[0].ageGroup).toBe("u16");
    expect(body.consents[0].accessLevel).toBe("freigeschaltet");
    expect(body.consents[0].consentStatus).toBe("granted");
    expect(body.consents[0].grantedAt).toBe("2026-04-02T10:00:00Z");
    expect(body.consents[0].tokenSendCount).toBe(1);

    // Moderation: flaggedCount + suspendedItems
    expect(typeof body.moderation.flaggedCount).toBe("number");
    expect(body.moderation.flaggedCount).toBe(3);
    expect(Array.isArray(body.moderation.suspendedItems)).toBe(true);
    expect(body.moderation.suspendedItems).toHaveLength(1);
  });
});
