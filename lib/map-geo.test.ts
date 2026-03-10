import { describe, it, expect } from "vitest";
import { buildOverpassQuery, parseOverpassBuildings } from "./map-geo";

describe("buildOverpassQuery", () => {
  it("erstellt gueltige Overpass-Query aus Bounding Box", () => {
    const query = buildOverpassQuery(47.55, 7.96, 47.56, 7.97);
    expect(query).toContain("[out:json]");
    expect(query).toContain('way["building"]');
    expect(query).toContain("47.55,7.96,47.56,7.97");
  });
});

describe("parseOverpassBuildings", () => {
  it("extrahiert Gebaeude mit Adressen aus Overpass-Antwort", () => {
    const mockData = {
      elements: [
        { type: "node", id: 1, lat: 47.553, lon: 7.964 },
        { type: "node", id: 2, lat: 47.554, lon: 7.964 },
        { type: "node", id: 3, lat: 47.554, lon: 7.965 },
        { type: "node", id: 4, lat: 47.553, lon: 7.965 },
        {
          type: "way", id: 100,
          tags: { building: "yes", "addr:housenumber": "11", "addr:street": "Purkersdorfer Straße" },
          nodes: [1, 2, 3, 4, 1],
        },
      ],
    };

    const buildings = parseOverpassBuildings(mockData);
    expect(buildings).toHaveLength(1);
    expect(buildings[0].houseNumber).toBe("11");
    expect(buildings[0].street).toBe("Purkersdorfer Straße");
    expect(buildings[0].centroid.lat).toBeCloseTo(47.5535, 3);
    expect(buildings[0].centroid.lng).toBeCloseTo(7.9645, 3);
    expect(buildings[0].outline).toHaveLength(5);
  });

  it("ignoriert Gebaeude ohne ausreichend Nodes", () => {
    const mockData = {
      elements: [
        { type: "node", id: 1, lat: 47.553, lon: 7.964 },
        { type: "node", id: 2, lat: 47.554, lon: 7.964 },
        {
          type: "way", id: 100,
          tags: { building: "yes" },
          nodes: [1, 2],
        },
      ],
    };
    expect(parseOverpassBuildings(mockData)).toHaveLength(0);
  });

  it("gibt leere Strasse/Hausnummer zurueck wenn nicht in OSM", () => {
    const mockData = {
      elements: [
        { type: "node", id: 1, lat: 47.553, lon: 7.964 },
        { type: "node", id: 2, lat: 47.554, lon: 7.964 },
        { type: "node", id: 3, lat: 47.554, lon: 7.965 },
        {
          type: "way", id: 200,
          tags: { building: "garage" },
          nodes: [1, 2, 3],
        },
      ],
    };

    const buildings = parseOverpassBuildings(mockData);
    expect(buildings).toHaveLength(1);
    expect(buildings[0].houseNumber).toBe("");
    expect(buildings[0].street).toBe("");
  });
});
