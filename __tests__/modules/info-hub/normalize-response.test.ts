import { describe, expect, it } from "vitest";
import { normalizeQuartierInfoResponse } from "@/modules/info-hub/normalize-response";

describe("normalizeQuartierInfoResponse", () => {
  it("behandelt Nicht-Array-Listen als leere Arrays", () => {
    const normalized = normalizeQuartierInfoResponse({
      nina: { headline: "Kaputt" },
      waste_next: { label: "Kaputt" },
      rathaus: { label: "Kaputt" },
      oepnv: { id: "Kaputt" },
      apotheken: { name: "Kaputt" },
      events: { title: "Kaputt" },
    });

    expect(normalized.nina).toEqual([]);
    expect(normalized.waste_next).toEqual([]);
    expect(normalized.rathaus).toEqual([]);
    expect(normalized.oepnv).toEqual([]);
    expect(normalized.apotheken).toEqual([]);
    expect(normalized.events).toEqual([]);
  });

  it("normalisiert OePNV-Abfahrten pro Haltestelle ebenfalls auf Arrays", () => {
    const normalized = normalizeQuartierInfoResponse({
      oepnv: [
        {
          id: "stop-1",
          name: "Bahnhof",
          departures: { line: "7300" },
        },
      ],
    });

    expect(normalized.oepnv).toEqual([
      {
        id: "stop-1",
        name: "Bahnhof",
        departures: [],
      },
    ]);
  });

  it("filtert falsch geformte OePNV-Haltestellen", () => {
    const normalized = normalizeQuartierInfoResponse({
      oepnv: [
        { name: "Ohne ID", departures: [] },
        { id: "stop-ohne-name", departures: [] },
        { id: 123, name: "Falsche ID", departures: [] },
        {
          id: "stop-1",
          name: "Bahnhof",
          departures: [],
        },
      ],
    });

    expect(normalized.oepnv).toEqual([
      {
        id: "stop-1",
        name: "Bahnhof",
        departures: [],
      },
    ]);
  });

  it("setzt skalare URL-Felder bei falschem Typ auf leer", () => {
    const normalized = normalizeQuartierInfoResponse({
      notdienst_url: { href: "https://example.invalid" },
      events_calendar_url: ["https://example.invalid"],
    });

    expect(normalized.notdienst_url).toBe("");
    expect(normalized.events_calendar_url).toBe("");
  });

  it("setzt falsch geformte Wetter- und Pollendaten auf null", () => {
    const normalized = normalizeQuartierInfoResponse({
      weather: { description: "kaputt" },
      pollen: { pollen: ["Birke"] },
    });

    expect(normalized.weather).toBeNull();
    expect(normalized.pollen).toBeNull();
  });

  it("erhaelt gueltige Wetter- und Pollendaten", () => {
    const normalized = normalizeQuartierInfoResponse({
      weather: {
        temp: 18,
        description: "sonnig",
        icon: "sun",
        forecast: [],
      },
      pollen: {
        region: "Oberrhein",
        pollen: {
          Birke: { today: 2.5, tomorrow: 2 },
        },
      },
    });

    expect(normalized.weather).toEqual({
      temp: 18,
      description: "sonnig",
      icon: "sun",
      forecast: [],
    });
    expect(normalized.pollen).toEqual({
      region: "Oberrhein",
      pollen: {
        Birke: { today: 2.5, tomorrow: 2 },
      },
    });
  });
});
