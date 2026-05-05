import { describe, expect, it, vi } from "vitest";
import {
  buildOverpassPharmacyQuery,
  mergePharmacies,
  parseOverpassPharmacies,
  runOsmPoiSync,
} from "@/modules/info-hub/services/osm-poi-sync.service";

describe("OSM pharmacy sync", () => {
  it("baut eine kleine Overpass-Query fuer Pharmacy-POIs", () => {
    const query = buildOverpassPharmacyQuery({
      swLat: 47.55,
      swLng: 7.96,
      neLat: 47.56,
      neLng: 7.97,
    });

    expect(query).toContain("[out:json][timeout:25]");
    expect(query).toContain('node["amenity"="pharmacy"](47.55,7.96,47.56,7.97)');
    expect(query).toContain('way["amenity"="pharmacy"](47.55,7.96,47.56,7.97)');
    expect(query).toContain('relation["healthcare"="pharmacy"](47.55,7.96,47.56,7.97)');
    expect(query).toContain("out center tags");
  });

  it("parst Nodes und Ways aus Overpass zu Apotheken", () => {
    const result = parseOverpassPharmacies({
      elements: [
        {
          type: "node",
          id: 1,
          lat: 47.553,
          lon: 7.964,
          tags: {
            name: "Schwarzwald-Apotheke",
            "addr:street": "Schuetzenstrasse",
            "addr:housenumber": "16/1",
            "addr:postcode": "79713",
            "addr:city": "Bad Saeckingen",
            phone: "07761 553550",
            opening_hours: "Mo-Fr 08:00-18:30",
          },
        },
        {
          type: "way",
          id: 2,
          center: { lat: 47.554, lon: 7.965 },
          tags: {
            name: "Bergsee-Apotheke",
            "contact:phone": "+49 7761 7486",
          },
        },
        { type: "node", id: 3, lat: 47.55, lon: 7.96, tags: {} },
      ],
    });

    expect(result).toEqual([
      expect.objectContaining({
        name: "Schwarzwald-Apotheke",
        address: "Schuetzenstrasse 16/1, 79713 Bad Saeckingen",
        phone: "07761 553550",
        openingHours: "Mo-Fr 08:00-18:30",
        source: "osm-overpass",
        osmId: "node/1",
        lat: 47.553,
        lng: 7.964,
      }),
      expect.objectContaining({
        name: "Bergsee-Apotheke",
        address: "",
        phone: "+49 7761 7486",
        openingHours: "Nicht angegeben",
        osmId: "way/2",
      }),
    ]);
  });

  it("merged OSM-Daten ohne manuelle Apotheken zu ueberschreiben", () => {
    const merged = mergePharmacies(
      [
        {
          name: "Schwarzwald-Apotheke",
          address: "Manuell gepflegt",
          phone: "07761 111",
          openingHours: "Manuell",
        },
        {
          name: "Alte OSM-Apotheke",
          address: "",
          phone: "",
          openingHours: "",
          source: "osm-overpass",
          osmId: "node/old",
        },
      ],
      [
        {
          name: "Schwarzwald-Apotheke",
          address: "OSM-Adresse",
          phone: "07761 222",
          openingHours: "OSM",
          source: "osm-overpass",
          osmId: "node/1",
          lat: 47.553,
          lng: 7.964,
        },
        {
          name: "Neue Apotheke",
          address: "Neue Strasse 1",
          phone: "",
          openingHours: "Nicht angegeben",
          source: "osm-overpass",
          osmId: "node/2",
          lat: 47.554,
          lng: 7.965,
        },
      ],
      "2026-05-04T20:00:00.000Z",
    );

    expect(merged).toHaveLength(2);
    expect(merged[0]).toMatchObject({
      name: "Schwarzwald-Apotheke",
      address: "Manuell gepflegt",
      phone: "07761 111",
    });
    expect(merged[1]).toMatchObject({
      name: "Neue Apotheke",
      source: "osm-overpass",
      syncedAt: "2026-05-04T20:00:00.000Z",
    });
  });

  it("synchronisiert aktive Quartiere in municipal_config", async () => {
    const updatePayloads: unknown[] = [];
    const supabase = createSupabaseMock(updatePayloads);
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        elements: [
          {
            type: "node",
            id: 1,
            lat: 47.553,
            lon: 7.964,
            tags: { name: "Neue Apotheke" },
          },
        ],
      }),
    });

    const result = await runOsmPoiSync(supabase as never, {
      fetcher,
      now: () => new Date("2026-05-04T20:00:00.000Z"),
    });

    expect(result).toMatchObject({
      quarters: 1,
      updated: 1,
      pharmacies: 1,
      errors: 0,
    });
    expect(fetcher).toHaveBeenCalledWith(
      expect.stringContaining("overpass-api.de/api/interpreter"),
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(updatePayloads[0]).toMatchObject({
      apotheken: [
        expect.objectContaining({ name: "Manuelle Apotheke" }),
        expect.objectContaining({
          name: "Neue Apotheke",
          source: "osm-overpass",
          syncedAt: "2026-05-04T20:00:00.000Z",
        }),
      ],
      sync_meta: {
        events: { status: "ok" },
        apotheken: {
          status: "ok",
          source: "osm-overpass",
          last_synced_at: "2026-05-04T20:00:00.000Z",
          found_count: 1,
          written_count: 1,
          manual_preserved_count: 1,
          error: null,
        },
      },
    });
  });

  it("schreibt Fehlerstatus in sync_meta.apotheken bei Quartier-Fehlern", async () => {
    const updatePayloads: unknown[] = [];
    const supabase = createSupabaseMock(updatePayloads);
    const fetcher = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({}),
    });

    const result = await runOsmPoiSync(supabase as never, {
      fetcher,
      now: () => new Date("2026-05-04T21:00:00.000Z"),
    });

    expect(result).toMatchObject({
      quarters: 1,
      updated: 0,
      pharmacies: 0,
      errors: 1,
    });
    expect(updatePayloads[0]).toMatchObject({
      sync_meta: {
        events: { status: "ok" },
        apotheken: {
          status: "error",
          source: "osm-overpass",
          last_synced_at: "2026-05-04T21:00:00.000Z",
          found_count: 0,
          written_count: 0,
          manual_preserved_count: 1,
          error: "Overpass API Fehler: 429",
        },
      },
    });
  });
});

function createSupabaseMock(updatePayloads: unknown[]) {
  return {
    from: vi.fn((table: string) => {
      if (table === "quarters") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: [
                {
                  id: "q1",
                  name: "Pilot",
                  bounds_sw_lat: 47.55,
                  bounds_sw_lng: 7.96,
                  bounds_ne_lat: 47.56,
                  bounds_ne_lng: 7.97,
                },
              ],
              error: null,
            }),
          }),
        };
      }

      if (table === "municipal_config") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  apotheken: [
                    {
                      name: "Manuelle Apotheke",
                      address: "Manuell",
                      phone: "",
                      openingHours: "",
                    },
                  ],
                  sync_meta: { events: { status: "ok" } },
                },
                error: null,
              }),
            }),
          }),
          update: vi.fn((payload: unknown) => {
            updatePayloads.push(payload);
            return {
              eq: vi.fn().mockResolvedValue({ error: null }),
            };
          }),
        };
      }

      throw new Error(`Unexpected table ${table}`);
    }),
  };
}
