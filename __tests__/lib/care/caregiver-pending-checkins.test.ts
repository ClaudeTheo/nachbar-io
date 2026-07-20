import { describe, expect, it, vi } from "vitest";

import { loadCaregiverPendingCheckinHouseholds } from "@/lib/care/caregiver-pending-checkins";

type TableData = {
  caregiver_links?: Array<{ resident_id: string }>;
  care_checkins?: Array<{ senior_id: string }>;
  household_members?: Array<{ household_id: string; user_id: string }>;
};

// Hilfs-Mock fuer Supabase-Query-Builder. Jede Table-Kette ist thenable
// und liefert das in `data` hinterlegte Array zurueck.
function createMockSupabase(data: TableData) {
  return {
    from: vi.fn((table: string) => {
      const chain: Record<string, unknown> = {};
      const fluent = () => chain;
      chain.select = vi.fn(fluent);
      chain.eq = vi.fn(fluent);
      chain.in = vi.fn(fluent);
      chain.is = vi.fn(fluent);
      chain.gte = vi.fn(fluent);
      chain.not = vi.fn(fluent);

      const row =
        table === "caregiver_links"
          ? data.caregiver_links ?? []
          : table === "care_checkins"
            ? data.care_checkins ?? []
            : table === "household_members"
              ? data.household_members ?? []
              : [];

      chain.then = (resolve: (v: { data: unknown; error: null }) => void) =>
        resolve({ data: row, error: null });
      return chain;
    }),
  };
}

describe("loadCaregiverPendingCheckinHouseholds", () => {
  it("liefert leeres Set wenn keine User-ID uebergeben wird", async () => {
    const supabase = createMockSupabase({}) as never;
    const result = await loadCaregiverPendingCheckinHouseholds(supabase, "");
    expect(result.size).toBe(0);
  });

  it("liefert leeres Set wenn keine aktiven Caregiver-Links existieren", async () => {
    const supabase = createMockSupabase({
      caregiver_links: [],
    }) as never;
    const result = await loadCaregiverPendingCheckinHouseholds(
      supabase,
      "caregiver-1",
    );
    expect(result.size).toBe(0);
  });

  it("liefert leeres Set wenn keine pending Check-ins existieren", async () => {
    const supabase = createMockSupabase({
      caregiver_links: [{ resident_id: "senior-1" }],
      care_checkins: [],
    }) as never;
    const result = await loadCaregiverPendingCheckinHouseholds(
      supabase,
      "caregiver-1",
    );
    expect(result.size).toBe(0);
  });

  it("liefert nach RLS-leerer Mitgliedersuche ein leeres Set ohne Fehler", async () => {
    const supabase = createMockSupabase({
      caregiver_links: [{ resident_id: "senior-1" }],
      care_checkins: [{ senior_id: "senior-1" }],
      household_members: [],
    }) as never;

    const result = await loadCaregiverPendingCheckinHouseholds(
      supabase,
      "caregiver-1",
    );

    expect(result).toEqual(new Set());
  });

  it("liefert household_ids fuer pending Check-ins der zugewiesenen Senioren", async () => {
    const supabase = createMockSupabase({
      caregiver_links: [
        { resident_id: "senior-1" },
        { resident_id: "senior-2" },
      ],
      care_checkins: [{ senior_id: "senior-1" }, { senior_id: "senior-2" }],
      household_members: [
        { household_id: "hh-a", user_id: "senior-1" },
        { household_id: "hh-b", user_id: "senior-2" },
      ],
    }) as never;
    const result = await loadCaregiverPendingCheckinHouseholds(
      supabase,
      "caregiver-1",
    );
    expect(result.has("hh-a")).toBe(true);
    expect(result.has("hh-b")).toBe(true);
    expect(result.size).toBe(2);
  });
});
