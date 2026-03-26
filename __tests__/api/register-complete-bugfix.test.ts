// __tests__/api/register-complete-bugfix.test.ts
// Tests fuer Bugfixes in /api/register/complete:
// 1. Orphan-Cleanup: Auth-User wird geloescht wenn Profil-Erstellung fehlschlaegt
// 2. Orphan-Repair: Verwaister Auth-User (ohne Profil) wird wiederverwendet
// 3. Non-Pilot-Street: Haushalt mit Fallback-Koordinaten fuer unbekannte Strassen
// 4. Geo-Detection: Registrierung ohne streetName/houseNumber funktioniert

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

// --- Steuerbare Mocks ---

const mockCreateUser = vi.fn();
const mockDeleteUser = vi.fn();
const mockListUsers = vi.fn();
const _mockInsert = vi.fn();
const _mockSelect = vi.fn();
const mockFrom = vi.fn();

// Hilfsfunktion: Chainable Query Builder
function chainBuilder(overrides: Record<string, unknown> = {}) {
  const chain: Record<string, unknown> = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    single: vi
      .fn()
      .mockResolvedValue({ data: { id: "quarter-1" }, error: null }),
    limit: vi.fn().mockReturnThis(),
    insert: vi.fn().mockResolvedValue({ error: null }),
    update: vi.fn().mockReturnThis(),
    ...overrides,
  };
  // Alle Methoden geben chain zurueck fuer Verkettung
  for (const key of Object.keys(chain)) {
    const val = chain[key];
    if (
      typeof val === "function" &&
      !(val as ReturnType<typeof vi.fn>).mockReturnThis
    ) {
      // Bereits konfiguriert
    }
  }
  return chain;
}

vi.mock("@/lib/supabase/admin", () => ({
  getAdminSupabase: vi.fn(() => ({
    auth: {
      admin: {
        createUser: mockCreateUser,
        deleteUser: mockDeleteUser,
        listUsers: mockListUsers,
      },
    },
    from: mockFrom,
  })),
}));

vi.mock("@/lib/notifications-server", () => ({
  safeInsertNotification: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock("@/lib/invite-codes", () => ({
  generateSecureCode: vi.fn().mockReturnValue("PILOT-TEST-CODE"),
  generateTempPassword: vi.fn().mockReturnValue("temp-password-123"),
}));

// --- Hilfsfunktion: Request erstellen ---
function makeRequest(body: Record<string, unknown>) {
  return new Request("http://localhost/api/register/complete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as unknown as NextRequest;
}

// Standard-Body fuer Registrierung
const baseBody = {
  email: "test@example.com",
  displayName: "Max Mustermann",
  uiMode: "active",
  verificationMethod: "address_manual",
};

describe("POST /api/register/complete — Bugfixes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key";
    process.env.PILOT_AUTO_VERIFY = "true";
  });

  // =========================================================================
  // Bug 1: Orphan-Cleanup — Auth-User loeschen bei Profil-Fehler
  // =========================================================================
  describe("Orphan-Cleanup (Auth-User Bereinigung bei Profil-Fehler)", () => {
    it("loescht Auth-User wenn Profil-Erstellung fehlschlaegt", async () => {
      // Auth-User erfolgreich erstellt
      mockCreateUser.mockResolvedValue({
        data: { user: { id: "new-user-1" } },
        error: null,
      });

      // Profil-Insert schlaegt fehl
      const usersInsert = vi.fn().mockResolvedValue({
        error: { message: "Duplicate key violation" },
      });
      mockFrom.mockImplementation((table: string) => {
        if (table === "users") {
          return { insert: usersInsert };
        }
        // Fallback fuer andere Tabellen
        return chainBuilder();
      });

      const { POST } = await import("@/app/api/register/complete/route");
      const res = await POST(makeRequest(baseBody));

      // Erwartung: 500 + Auth-User wurde bereinigt
      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.error).toContain("Profil konnte nicht erstellt werden");

      // deleteUser muss mit der neuen User-ID aufgerufen worden sein
      expect(mockDeleteUser).toHaveBeenCalledWith("new-user-1");
    });

    it("gibt trotzdem 500 zurueck wenn Cleanup fehlschlaegt (kein Crash)", async () => {
      mockCreateUser.mockResolvedValue({
        data: { user: { id: "new-user-2" } },
        error: null,
      });

      // Profil-Insert fehlschlaegt
      mockFrom.mockImplementation((table: string) => {
        if (table === "users") {
          return {
            insert: vi.fn().mockResolvedValue({
              error: { message: "DB Error" },
            }),
          };
        }
        return chainBuilder();
      });

      // deleteUser schlaegt auch fehl
      mockDeleteUser.mockRejectedValue(new Error("Cleanup failed"));

      const { POST } = await import("@/app/api/register/complete/route");
      const res = await POST(makeRequest(baseBody));

      // API darf nicht crashen — muss dennoch 500 zurueckgeben
      expect(res.status).toBe(500);
      expect(mockDeleteUser).toHaveBeenCalledWith("new-user-2");
    });
  });

  // =========================================================================
  // Bug 2: Orphan-Repair — Verwaister Auth-User wird wiederverwendet
  // =========================================================================
  describe("Orphan-Repair (Auth-User ohne Profil wiederverwenden)", () => {
    it("verwendet verwaisten Auth-User wieder und erstellt Profil", async () => {
      // createUser schlaegt fehl: "already registered"
      mockCreateUser.mockResolvedValue({
        data: null,
        error: {
          message: "A user with this email address has already been registered",
        },
      });

      // listUsers findet den Auth-User
      mockListUsers.mockResolvedValue({
        data: {
          users: [{ id: "orphan-user-1", email: "test@example.com" }],
        },
      });

      // Profil-Check: kein Profil vorhanden (orphaned)
      const profileCheck = vi
        .fn()
        .mockResolvedValue({ data: null, error: null });
      const profileInsert = vi.fn().mockResolvedValue({ error: null });
      const memberInsert = vi.fn().mockResolvedValue({ error: null });
      const verificationInsert = vi.fn().mockResolvedValue({ error: null });

      mockFrom.mockImplementation((table: string) => {
        if (table === "users") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: profileCheck,
              }),
            }),
            insert: profileInsert,
          };
        }
        if (table === "household_members") {
          return { insert: memberInsert };
        }
        if (table === "verification_requests") {
          return { insert: verificationInsert };
        }
        return chainBuilder();
      });

      const { POST } = await import("@/app/api/register/complete/route");
      const res = await POST(
        makeRequest({
          ...baseBody,
          householdId: "hh-1",
        }),
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      // Die orphan-user-ID muss verwendet worden sein
      expect(body.userId).toBe("orphan-user-1");

      // Profil muss mit der orphan-ID erstellt worden sein
      expect(profileInsert).toHaveBeenCalledWith(
        expect.objectContaining({ id: "orphan-user-1" }),
      );
    });

    it("gibt 409 zurueck wenn Auth-User UND Profil existieren", async () => {
      mockCreateUser.mockResolvedValue({
        data: null,
        error: {
          message: "A user with this email address has already been registered",
        },
      });

      mockListUsers.mockResolvedValue({
        data: {
          users: [{ id: "existing-user-1", email: "test@example.com" }],
        },
      });

      // Profil existiert bereits (NICHT orphaned)
      mockFrom.mockImplementation((table: string) => {
        if (table === "users") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id: "existing-user-1" },
                  error: null,
                }),
              }),
            }),
          };
        }
        return chainBuilder();
      });

      const { POST } = await import("@/app/api/register/complete/route");
      const res = await POST(makeRequest(baseBody));

      expect(res.status).toBe(409);
      const body = await res.json();
      expect(body.error).toContain("bereits registriert");
    });
  });

  // =========================================================================
  // Bug 3: Haushalt-Erstellung mit Client-Koordinaten (Photon Geocoding)
  // =========================================================================
  describe("Haushalt-Erstellung mit Photon-Koordinaten", () => {
    it("erstellt Haushalt mit uebergebenen Koordinaten", async () => {
      mockCreateUser.mockResolvedValue({
        data: { user: { id: "user-street-1" } },
        error: null,
      });

      const householdInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: "new-hh-1" },
            error: null,
          }),
        }),
      });

      const quarterSelect = vi.fn().mockReturnValue({
        limit: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: "quarter-bs" },
            error: null,
          }),
        }),
      });

      const householdMaybeSingle = vi
        .fn()
        .mockResolvedValue({ data: null, error: null });
      const profileInsert = vi.fn().mockResolvedValue({ error: null });
      const memberInsert = vi.fn().mockResolvedValue({ error: null });
      const verificationInsert = vi.fn().mockResolvedValue({ error: null });

      mockFrom.mockImplementation((table: string) => {
        if (table === "quarters") {
          return { select: quarterSelect };
        }
        if (table === "households") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: householdMaybeSingle,
                }),
              }),
            }),
            insert: householdInsert,
          };
        }
        if (table === "users") {
          return { insert: profileInsert };
        }
        if (table === "household_members") {
          return { insert: memberInsert };
        }
        if (table === "verification_requests") {
          return { insert: verificationInsert };
        }
        return chainBuilder();
      });

      const { POST } = await import("@/app/api/register/complete/route");
      const res = await POST(
        makeRequest({
          ...baseBody,
          streetName: "Wallbacher Straße",
          houseNumber: "5",
          lat: 47.554,
          lng: 7.965,
        }),
      );

      expect(res.status).toBe(200);

      // Haushalt muss mit uebergebenen Koordinaten erstellt worden sein
      expect(householdInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          street_name: "Wallbacher Straße",
          house_number: "5",
          lat: 47.554,
          lng: 7.965,
          verified: false,
        }),
      );
    });

    it("erstellt Haushalt ohne Koordinaten mit lat/lng 0", async () => {
      mockCreateUser.mockResolvedValue({
        data: { user: { id: "user-street-2" } },
        error: null,
      });

      const householdInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: "new-hh-2" },
            error: null,
          }),
        }),
      });

      const quarterSelect = vi.fn().mockReturnValue({
        limit: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: "quarter-bs" },
            error: null,
          }),
        }),
      });

      const householdMaybeSingle = vi
        .fn()
        .mockResolvedValue({ data: null, error: null });
      const profileInsert = vi.fn().mockResolvedValue({ error: null });
      const memberInsert = vi.fn().mockResolvedValue({ error: null });
      const verificationInsert = vi.fn().mockResolvedValue({ error: null });

      mockFrom.mockImplementation((table: string) => {
        if (table === "quarters") {
          return { select: quarterSelect };
        }
        if (table === "households") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: householdMaybeSingle,
                }),
              }),
            }),
            insert: householdInsert,
          };
        }
        if (table === "users") {
          return { insert: profileInsert };
        }
        if (table === "household_members") {
          return { insert: memberInsert };
        }
        if (table === "verification_requests") {
          return { insert: verificationInsert };
        }
        return chainBuilder();
      });

      const { POST } = await import("@/app/api/register/complete/route");
      const res = await POST(
        makeRequest({
          ...baseBody,
          streetName: "Purkersdorfer Straße",
          houseNumber: "10",
          // Keine lat/lng — Fallback auf 0/0
        }),
      );

      expect(res.status).toBe(200);

      expect(householdInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          street_name: "Purkersdorfer Straße",
          house_number: "10",
          lat: 0,
          lng: 0,
          verified: false,
          quarter_id: "quarter-bs",
        }),
      );
    });
  });

  // =========================================================================
  // Bug 4: Geo-Detection — Registrierung ohne Adresse funktioniert
  // =========================================================================
  describe("Geo-Detection (kein streetName/houseNumber)", () => {
    it("erstellt Profil ohne Haushalt bei fehlender Adresse", async () => {
      mockCreateUser.mockResolvedValue({
        data: { user: { id: "user-geo-1" } },
        error: null,
      });

      const profileInsert = vi.fn().mockResolvedValue({ error: null });

      mockFrom.mockImplementation((table: string) => {
        if (table === "users") {
          return { insert: profileInsert };
        }
        return chainBuilder();
      });

      const { POST } = await import("@/app/api/register/complete/route");
      const res = await POST(
        makeRequest({
          email: "geo@example.com",
          displayName: "Geo User",
          uiMode: "senior",
          verificationMethod: "address_manual",
          // Kein streetName, kein houseNumber, kein householdId
        }),
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.userId).toBe("user-geo-1");

      // Profil muss erstellt worden sein
      expect(profileInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "user-geo-1",
          display_name: "Geo User",
          ui_mode: "senior",
        }),
      );
    });
  });

  // =========================================================================
  // Basis-Validierung
  // =========================================================================
  describe("Basis-Validierung", () => {
    it("gibt 400 zurueck ohne displayName", async () => {
      const { POST } = await import("@/app/api/register/complete/route");
      const res = await POST(
        makeRequest({
          email: "test@example.com",
          displayName: "",
          verificationMethod: "address_manual",
        }),
      );

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain("Anzeigename");
    });

    it("gibt 400 zurueck ohne E-Mail", async () => {
      const { POST } = await import("@/app/api/register/complete/route");
      const res = await POST(
        makeRequest({
          displayName: "Test User",
          verificationMethod: "address_manual",
        }),
      );

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain("E-Mail");
    });
  });
});
