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

  it("filtert falsch geformte OePNV-Abfahrten pro Haltestelle", () => {
    const normalized = normalizeQuartierInfoResponse({
      oepnv: [
        {
          id: "stop-1",
          name: "Bahnhof",
          departures: [
            {
              destination: "Waldshut Busbahnhof",
              time: "12:28",
              platform: "14",
              countdown: 5,
            },
            {
              line: "7310",
              time: "12:30",
              platform: "2",
              countdown: 7,
            },
            {
              line: "7311",
              destination: "Rheinfelden",
              platform: "3",
              countdown: 8,
            },
            {
              line: "7312",
              destination: "Laufenburg",
              time: "12:40",
              platform: 4,
              countdown: 12,
            },
            {
              line: "7313",
              destination: "Wehr",
              time: "12:45",
              platform: "5",
              countdown: "17",
            },
            {
              line: "7300",
              destination: "Waldshut Busbahnhof",
              time: "12:28",
              platform: "14",
              countdown: 5,
              hint: "Ersatzverkehr",
            },
          ],
        },
      ],
    });

    expect(normalized.oepnv).toEqual([
      {
        id: "stop-1",
        name: "Bahnhof",
        departures: [
          {
            line: "7300",
            destination: "Waldshut Busbahnhof",
            time: "12:28",
            platform: "14",
            countdown: 5,
            hint: "Ersatzverkehr",
          },
        ],
      },
    ]);
  });

  it("filtert falsch geformte NINA-Warnungen", () => {
    const normalized = normalizeQuartierInfoResponse({
      nina: [
        { id: "warnung-ohne-severity", headline: "Ohne Warnstufe" },
        { id: "warnung-ohne-headline", severity: "Severe" },
        {
          id: "warnung-falsche-severity",
          severity: "Critical",
          headline: "Kaputt",
        },
        {
          id: "warnung-1",
          warning_id: "warning-1",
          severity: "Severe",
          headline: "Gewitter im Anmarsch",
          description: null,
          sent_at: "2026-05-07T16:00:00Z",
          expires_at: null,
        },
      ],
    });

    expect(normalized.nina).toEqual([
      {
        id: "warnung-1",
        warning_id: "warning-1",
        severity: "Severe",
        headline: "Gewitter im Anmarsch",
        description: null,
        sent_at: "2026-05-07T16:00:00Z",
        expires_at: null,
      },
    ]);
  });

  it("filtert falsch geformte Muellabfuhr-Eintraege", () => {
    const normalized = normalizeQuartierInfoResponse({
      waste_next: [
        { type: "restmuell", label: "Ohne Datum" },
        { date: "2026-05-08", label: "Ohne Typ" },
        { date: "morgen", type: "bio", label: "Falsches Datum" },
        { date: "2026-05-09", type: 123, label: "Falscher Typ" },
        {
          date: "2026-05-10",
          type: "papier",
          label: "Papier",
        },
      ],
    });

    expect(normalized.waste_next).toEqual([
      {
        date: "2026-05-10",
        type: "papier",
        label: "Papier",
      },
    ]);
  });

  it("filtert falsch geformte Rathaus-Link-Eintraege", () => {
    const normalized = normalizeQuartierInfoResponse({
      rathaus: [
        {
          label: "Ohne Beschreibung",
          url: "https://www.bad-saeckingen.de",
          icon: "landmark",
        },
        {
          label: "Ohne URL",
          description: "Kaputter Link",
          icon: "landmark",
        },
        {
          label: "Falsches Icon",
          description: "Kaputter Link",
          url: "https://www.bad-saeckingen.de",
          icon: null,
        },
        {
          label: "Rathaus",
          description: "Kontakt und Oeffnungszeiten",
          url: "https://www.bad-saeckingen.de/rathaus-service/buergerservice/kontakt-oeffnungszeiten",
          icon: "landmark",
        },
      ],
    });

    expect(normalized.rathaus).toEqual([
      {
        label: "Rathaus",
        description: "Kontakt und Oeffnungszeiten",
        url: "https://www.bad-saeckingen.de/rathaus-service/buergerservice/kontakt-oeffnungszeiten",
        icon: "landmark",
      },
    ]);
  });

  it("filtert falsch geformte Apotheken-Eintraege", () => {
    const normalized = normalizeQuartierInfoResponse({
      apotheken: [
        {
          address: "Hauptstrasse 1",
          phone: "07761 1234",
          openingHours: "Mo-Fr 08:00-18:00",
        },
        {
          name: "Apotheke ohne Telefon",
          address: "Hauptstrasse 2",
          openingHours: "Mo-Fr 08:00-18:00",
        },
        {
          name: "Apotheke mit kaputter Oeffnungszeit",
          address: "Hauptstrasse 3",
          phone: "07761 9876",
          openingHours: null,
        },
        {
          name: "Stadt-Apotheke",
          address: "Hauptstrasse 4",
          phone: "07761 5555",
          openingHours: "Mo-Fr 08:00-18:00",
        },
      ],
    });

    expect(normalized.apotheken).toEqual([
      {
        name: "Stadt-Apotheke",
        address: "Hauptstrasse 4",
        phone: "07761 5555",
        openingHours: "Mo-Fr 08:00-18:00",
      },
    ]);
  });

  it("filtert falsch geformte Event-Eintraege", () => {
    const normalized = normalizeQuartierInfoResponse({
      events: [
        {
          description: "Ohne Titel",
          schedule: "Sa 10:00 Uhr",
          location: "Marktplatz",
          icon: "calendar",
        },
        {
          title: "Event ohne Ort",
          description: "Kaputter Termin",
          schedule: "Sa 10:00 Uhr",
          icon: "calendar",
        },
        {
          title: "Event mit kaputtem Icon",
          description: "Kaputter Termin",
          schedule: "Sa 10:00 Uhr",
          location: "Marktplatz",
          icon: 123,
        },
        {
          title: "Wochenmarkt",
          description: "Frische Lebensmittel aus der Region",
          schedule: "Sa 08:00-12:00 Uhr",
          location: "Marktplatz",
          icon: "calendar",
        },
      ],
    });

    expect(normalized.events).toEqual([
      {
        title: "Wochenmarkt",
        description: "Frische Lebensmittel aus der Region",
        schedule: "Sa 08:00-12:00 Uhr",
        location: "Marktplatz",
        icon: "calendar",
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
