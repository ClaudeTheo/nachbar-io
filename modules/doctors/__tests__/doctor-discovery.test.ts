// Tests fuer modules/doctors/services/doctor-discovery.service.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { discoverDoctorsForQuarter } from "../services/doctor-discovery.service";
import type { OsmDoctorCandidate } from "@/lib/doctors/osm-doctors-client";

const QUARTER_ID = "ee6cfcab-f615-47cd-afe7-808a27cb584b";
const BS_LAT = 47.5535;
const BS_LNG = 7.964;

// Hilfsfunktion: minimaler Mock-Client
function makeMockDb(opts: {
  existing?: string[];
  upsertError?: { message: string } | null;
  pruneError?: { message: string } | null;
  prunedIds?: string[];
}) {
  const upsertCalls: unknown[] = [];
  const updateCalls: unknown[] = [];
  return {
    upsertCalls,
    updateCalls,
    from(table: string) {
      if (table !== "external_doctors") {
        throw new Error(`Unexpected table: ${table}`);
      }
      return {
        select(_cols: string) {
          // SELECT chain (existing-Lookup)
          return {
            eq() {
              return this;
            },
            in() {
              return Promise.resolve({
                data: (opts.existing ?? []).map((source_ref) => ({ source_ref })),
                error: null,
              });
            },
          };
        },
        upsert(rows: unknown[]) {
          upsertCalls.push(rows);
          return Promise.resolve({
            data: null,
            error: opts.upsertError ?? null,
          });
        },
        update(values: unknown) {
          updateCalls.push(values);
          // Chain: .eq().eq().eq().lt().select(...) → returns Promise
          const chain: Record<string, unknown> = {
            eq: () => chain,
            lt: () => chain,
            select: () =>
              Promise.resolve({
                data: opts.pruneError
                  ? null
                  : (opts.prunedIds ?? []).map((id) => ({ id })),
                error: opts.pruneError ?? null,
              }),
          };
          return chain;
        },
      };
    },
  };
}

function makeCandidate(
  id: number,
  overrides: Partial<OsmDoctorCandidate> = {},
): OsmDoctorCandidate {
  return {
    source: "osm",
    source_ref: `node/${id}`,
    name: `Praxis ${id}`,
    specialization: ["Allgemein"],
    address: "Teststr. 1, 79713 Bad Saeckingen",
    phone: null,
    website: null,
    email: null,
    latitude: BS_LAT,
    longitude: BS_LNG,
    distance_km: 0,
    ...overrides,
  };
}

describe("discoverDoctorsForQuarter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("inserted/updated wird korrekt gezaehlt", async () => {
    const candidates = [makeCandidate(1), makeCandidate(2), makeCandidate(3)];
    const db = makeMockDb({ existing: ["node/2"] });

    const report = await discoverDoctorsForQuarter(
      db as never,
      QUARTER_ID,
      BS_LAT,
      BS_LNG,
      { candidates },
    );

    expect(report.total).toBe(3);
    expect(report.inserted).toBe(2);
    expect(report.updated).toBe(1);
    expect(report.errors).toEqual([]);
    expect(db.upsertCalls).toHaveLength(1);
  });

  it("setzt visible=false fuer stale Eintraege via Pruning-Step", async () => {
    const db = makeMockDb({
      existing: [],
      prunedIds: ["stale-1", "stale-2"],
    });

    const report = await discoverDoctorsForQuarter(
      db as never,
      QUARTER_ID,
      BS_LAT,
      BS_LNG,
      { candidates: [makeCandidate(1)] },
    );

    expect(report.hidden).toBe(2);
    expect(db.updateCalls[0]).toEqual({ visible: false });
  });

  it("liefert leeren Report wenn OSM 0 Kandidaten zurueckgibt", async () => {
    const db = makeMockDb({ existing: [] });

    const report = await discoverDoctorsForQuarter(
      db as never,
      QUARTER_ID,
      BS_LAT,
      BS_LNG,
      { candidates: [] },
    );

    expect(report.total).toBe(0);
    expect(report.inserted).toBe(0);
    expect(report.updated).toBe(0);
    expect(db.upsertCalls).toHaveLength(0);
  });

  it("faengt Upsert-Fehler ab und meldet sie im Report", async () => {
    const db = makeMockDb({
      upsertError: { message: "FK violation" },
    });

    const report = await discoverDoctorsForQuarter(
      db as never,
      QUARTER_ID,
      BS_LAT,
      BS_LNG,
      { candidates: [makeCandidate(1)] },
    );

    expect(report.errors).toContain("Upsert: FK violation");
    expect(report.inserted).toBe(0);
  });

  it("faengt OSM-Fetch-Fehler ab", async () => {
    const failingFetch = vi.fn().mockRejectedValue(new Error("Network down"));
    const db = makeMockDb({});

    const report = await discoverDoctorsForQuarter(
      db as never,
      QUARTER_ID,
      BS_LAT,
      BS_LNG,
      { fetchImpl: failingFetch },
    );

    expect(report.errors.length).toBeGreaterThan(0);
    expect(report.errors[0]).toContain("OSM-Fetch fehlgeschlagen");
    expect(report.total).toBe(0);
  });

  it("setzt korrekte Row-Felder beim Upsert (Founder 1a: Default 'Allgemein')", async () => {
    const db = makeMockDb({});
    const candidates = [
      makeCandidate(42, {
        name: "Dr. Test",
        specialization: ["Allgemein"],
        phone: "+49 7761 1",
        website: "https://x.de",
      }),
    ];

    await discoverDoctorsForQuarter(db as never, QUARTER_ID, BS_LAT, BS_LNG, {
      candidates,
    });

    const rows = db.upsertCalls[0] as Record<string, unknown>[];
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      quarter_id: QUARTER_ID,
      source: "osm",
      source_ref: "node/42",
      name: "Dr. Test",
      specialization: ["Allgemein"],
      phone: "+49 7761 1",
      website: "https://x.de",
      visible: true,
    });
  });
});
