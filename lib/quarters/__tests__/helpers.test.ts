// lib/quarters/__tests__/helpers.test.ts
// Unit-Tests fuer Multi-Quartier Hilfsfunktionen

import { describe, it, expect, beforeEach } from "vitest";
import { createRouteMockSupabase } from "@/lib/care/__tests__/mock-supabase";
import { getUserQuarterId, getUserRole } from "../helpers";

describe("getUserQuarterId", () => {
  const mock = createRouteMockSupabase();

  beforeEach(() => {
    mock.reset();
  });

  it("gibt quarter_id zurueck wenn Nutzer verifizierte Mitgliedschaft hat", async () => {
    mock.addResponse("household_members", {
      data: { households: { quarter_id: "q-bad-saeckingen" } },
      error: null,
    });

    const result = await getUserQuarterId(mock.supabase, "user-1");
    expect(result).toBe("q-bad-saeckingen");
  });

  it("gibt null zurueck wenn Nutzer keine Mitgliedschaft hat", async () => {
    mock.addResponse("household_members", {
      data: null,
      error: null,
    });

    const result = await getUserQuarterId(mock.supabase, "user-unknown");
    expect(result).toBeNull();
  });

  it("gibt null zurueck wenn Mitgliedschaft nicht verifiziert ist (verified_at ist null)", async () => {
    // Wenn verified_at null ist, filtert die .not("verified_at", "is", null) Bedingung
    // den Datensatz heraus — Supabase gibt dann null zurueck
    mock.addResponse("household_members", {
      data: null,
      error: null,
    });

    const result = await getUserQuarterId(mock.supabase, "user-unverified");
    expect(result).toBeNull();
  });

  it("gibt null zurueck wenn households-Relation null ist", async () => {
    mock.addResponse("household_members", {
      data: { households: null },
      error: null,
    });

    const result = await getUserQuarterId(mock.supabase, "user-1");
    expect(result).toBeNull();
  });
});

describe("getUserRole", () => {
  const mock = createRouteMockSupabase();

  beforeEach(() => {
    mock.reset();
  });

  it("gibt 'user' fuer normale Nutzer zurueck", async () => {
    mock.addResponse("users", {
      data: { role: "user" },
      error: null,
    });

    const result = await getUserRole(mock.supabase, "user-1");
    expect(result).toBe("user");
  });

  it("gibt 'super_admin' fuer Super-Admins zurueck", async () => {
    mock.addResponse("users", {
      data: { role: "super_admin" },
      error: null,
    });

    const result = await getUserRole(mock.supabase, "admin-1");
    expect(result).toBe("super_admin");
  });

  it("gibt 'quarter_admin' fuer Quartier-Admins zurueck", async () => {
    mock.addResponse("users", {
      data: { role: "quarter_admin" },
      error: null,
    });

    const result = await getUserRole(mock.supabase, "qadmin-1");
    expect(result).toBe("quarter_admin");
  });

  it("gibt 'user' als Default zurueck wenn Nutzer nicht gefunden wird", async () => {
    mock.addResponse("users", {
      data: null,
      error: null,
    });

    const result = await getUserRole(mock.supabase, "nonexistent");
    expect(result).toBe("user");
  });

  it("gibt 'user' als Default zurueck wenn role-Feld null ist", async () => {
    mock.addResponse("users", {
      data: { role: null },
      error: null,
    });

    const result = await getUserRole(mock.supabase, "user-no-role");
    expect(result).toBe("user");
  });
});
