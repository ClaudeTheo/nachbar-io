// __tests__ fuer lib/doctors/osm-doctors-client.ts
// Deckt: Parser, Whitelist-Mapping, Adress-Bau, Dedup, Sortierung, Fetch-Roundtrip.

import { describe, it, expect, vi } from "vitest";
import {
  parseOverpassElements,
  extractSpecialization,
  fetchDoctorsFromOSM,
} from "../osm-doctors-client";

// Bad Saeckingen Zentrum
const BS_LAT = 47.5535;
const BS_LNG = 7.964;

describe("extractSpecialization", () => {
  it("mappt OSM general_practitioner → Allgemein", () => {
    expect(extractSpecialization({ "healthcare:speciality": "general_practitioner" })).toEqual([
      "Allgemein",
    ]);
  });

  it("mappt OSM ophthalmology → Augenheilkunde", () => {
    expect(extractSpecialization({ "healthcare:speciality": "ophthalmology" })).toEqual([
      "Augenheilkunde",
    ]);
  });

  it("akzeptiert Komma-separierte Mehrfach-Werte", () => {
    const result = extractSpecialization({
      "healthcare:speciality": "general_practitioner,paediatrics",
    });
    expect(result.sort()).toEqual(["Allgemein", "Kinderheilkunde"]);
  });

  it("akzeptiert Semikolon-separierte Mehrfach-Werte (OSM-Konvention)", () => {
    const result = extractSpecialization({
      "healthcare:speciality": "orthopaedics;cardiology",
    });
    expect(result.sort()).toEqual(["Kardiologie", "Orthopaedie"]);
  });

  it("dedupliziert duplicate specialities", () => {
    const result = extractSpecialization({
      "healthcare:speciality": "general_practitioner",
      "healthcare:speciality_1": "general_practitioner",
    });
    expect(result).toEqual(["Allgemein"]);
  });

  it("liefert Default-Bucket 'Allgemein' wenn kein Tag passt", () => {
    expect(extractSpecialization({})).toEqual(["Allgemein"]);
    expect(extractSpecialization({ "healthcare:speciality": "unbekannter_kram" })).toEqual([
      "Allgemein",
    ]);
  });

  it("ignoriert leere Strings + Whitespace", () => {
    expect(extractSpecialization({ "healthcare:speciality": "  " })).toEqual(["Allgemein"]);
    expect(extractSpecialization({ "healthcare:speciality": " GENERAL " })).toEqual([
      "Allgemein",
    ]);
  });
});

describe("parseOverpassElements", () => {
  it("ignoriert Elemente ohne Koordinaten", () => {
    const result = parseOverpassElements(
      [{ type: "node", id: 1, tags: { name: "Test" } }],
      BS_LAT,
      BS_LNG,
    );
    expect(result).toEqual([]);
  });

  it("ignoriert Elemente ohne Namen (Senior-Anzeige unbrauchbar)", () => {
    const result = parseOverpassElements(
      [{ type: "node", id: 1, lat: BS_LAT, lon: BS_LNG, tags: {} }],
      BS_LAT,
      BS_LNG,
    );
    expect(result).toEqual([]);
  });

  it("baut Candidate mit voller Adresse + Phone + Website", () => {
    const result = parseOverpassElements(
      [
        {
          type: "node",
          id: 12345,
          lat: BS_LAT,
          lon: BS_LNG,
          tags: {
            name: "Praxis Dr. Schmidt",
            "addr:street": "Rathausplatz",
            "addr:housenumber": "1",
            "addr:postcode": "79713",
            "addr:city": "Bad Saeckingen",
            phone: "+49 7761 123456",
            website: "https://praxis-schmidt.de",
            "healthcare:speciality": "general_practitioner",
          },
        },
      ],
      BS_LAT,
      BS_LNG,
    );
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      source: "osm",
      source_ref: "node/12345",
      name: "Praxis Dr. Schmidt",
      specialization: ["Allgemein"],
      address: "Rathausplatz 1, 79713 Bad Saeckingen",
      phone: "+49 7761 123456",
      website: "https://praxis-schmidt.de",
      latitude: BS_LAT,
      longitude: BS_LNG,
      distance_km: 0,
    });
  });

  it("liest Koordinaten aus way.center wenn lat/lon fehlen", () => {
    const result = parseOverpassElements(
      [
        {
          type: "way",
          id: 999,
          center: { lat: BS_LAT, lon: BS_LNG },
          tags: { name: "Klinik" },
        },
      ],
      BS_LAT,
      BS_LNG,
    );
    expect(result).toHaveLength(1);
    expect(result[0].latitude).toBe(BS_LAT);
    expect(result[0].source_ref).toBe("way/999");
  });

  it("akzeptiert contact:phone / contact:website / contact:email als Fallback", () => {
    const result = parseOverpassElements(
      [
        {
          type: "node",
          id: 1,
          lat: BS_LAT,
          lon: BS_LNG,
          tags: {
            name: "Praxis",
            "contact:phone": "0123",
            "contact:website": "https://x.de",
            "contact:email": "a@b.de",
          },
        },
      ],
      BS_LAT,
      BS_LNG,
    );
    expect(result[0].phone).toBe("0123");
    expect(result[0].website).toBe("https://x.de");
    expect(result[0].email).toBe("a@b.de");
  });

  it("dedupliziert nach source_ref (same way + node id)", () => {
    const result = parseOverpassElements(
      [
        {
          type: "node",
          id: 1,
          lat: BS_LAT,
          lon: BS_LNG,
          tags: { name: "Praxis A" },
        },
        {
          type: "node",
          id: 1,
          lat: BS_LAT,
          lon: BS_LNG,
          tags: { name: "Praxis A Duplikat" },
        },
      ],
      BS_LAT,
      BS_LNG,
    );
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Praxis A");
  });

  it("sortiert nach distance_km aufsteigend", () => {
    const result = parseOverpassElements(
      [
        {
          type: "node",
          id: 1,
          lat: BS_LAT + 0.05,
          lon: BS_LNG + 0.05,
          tags: { name: "Fern" },
        },
        {
          type: "node",
          id: 2,
          lat: BS_LAT,
          lon: BS_LNG,
          tags: { name: "Nah" },
        },
      ],
      BS_LAT,
      BS_LNG,
    );
    expect(result.map((d) => d.name)).toEqual(["Nah", "Fern"]);
  });
});

describe("fetchDoctorsFromOSM", () => {
  it("ruft Overpass-API auf und parsed Antwort", async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          elements: [
            {
              type: "node",
              id: 42,
              lat: BS_LAT,
              lon: BS_LNG,
              tags: { name: "Dr. Test" },
            },
          ],
        }),
        { status: 200 },
      ),
    );

    const result = await fetchDoctorsFromOSM(BS_LAT, BS_LNG, 5, mockFetch);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Dr. Test");

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe("https://overpass-api.de/api/interpreter");
    expect(init.method).toBe("POST");
    expect(init.body).toContain("around%3A5000");
  });

  it("wirft bei HTTP-Fehler", async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response("", { status: 500 }),
    );
    await expect(fetchDoctorsFromOSM(BS_LAT, BS_LNG, 5, mockFetch)).rejects.toThrow(
      /Overpass-API HTTP 500/,
    );
  });
});
