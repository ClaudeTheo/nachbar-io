// __tests__/lib/feeds/ical-parser.test.ts
// Welle W10 — Generischer iCal/ICS-Parser fuer Event-Crawling.
// Pendant zu rss-parser.ts. Konzeptueller Klon der Logik aus
// modules/waste/services/ics-connector.ts (privat dort), generalisiert.

import { describe, expect, it } from "vitest";

import { parseIcalFeed } from "@/lib/feeds/ical-parser";

const SAMPLE_ICAL = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Stadt Bad Saeckingen//Events//DE
BEGIN:VEVENT
UID:evt-001@example.test
SUMMARY:Wochenmarkt
DESCRIPTION:Frische Produkte
LOCATION:Muensterplatz
DTSTART;VALUE=DATE:20260516
DTEND;VALUE=DATE:20260517
END:VEVENT
BEGIN:VEVENT
UID:evt-002@example.test
SUMMARY:Sommerfest am Rhein
DESCRIPTION:Konzert + Feuerwerk
LOCATION:Rheinpromenade
DTSTART:20260606T180000Z
DTEND:20260606T230000Z
END:VEVENT
END:VCALENDAR`;

describe("parseIcalFeed", () => {
  it("parst zwei VEVENT-Bloecke", () => {
    const events = parseIcalFeed(SAMPLE_ICAL);
    expect(events).toHaveLength(2);
  });

  it("extrahiert UID, Summary, Description, Location", () => {
    const events = parseIcalFeed(SAMPLE_ICAL);
    expect(events[0].uid).toBe("evt-001@example.test");
    expect(events[0].summary).toBe("Wochenmarkt");
    expect(events[0].description).toBe("Frische Produkte");
    expect(events[0].location).toBe("Muensterplatz");
  });

  it("erkennt VALUE=DATE als All-Day", () => {
    const events = parseIcalFeed(SAMPLE_ICAL);
    expect(events[0].isAllDay).toBe(true);
    expect(events[0].startDate).toBe("2026-05-16");
    expect(events[0].endDate).toBe("2026-05-17");
  });

  it("parst Zeitstempel mit DTSTART/DTEND", () => {
    const events = parseIcalFeed(SAMPLE_ICAL);
    expect(events[1].isAllDay).toBe(false);
    expect(events[1].startDate).toBe("2026-06-06T18:00:00.000Z");
    expect(events[1].endDate).toBe("2026-06-06T23:00:00.000Z");
  });

  it("liefert leeres Array fuer Nicht-iCal-Input", () => {
    expect(parseIcalFeed("not ical")).toEqual([]);
    expect(parseIcalFeed("")).toEqual([]);
  });

  it("ueberspringt VEVENTs ohne DTSTART oder SUMMARY", () => {
    const ics = `BEGIN:VCALENDAR
BEGIN:VEVENT
SUMMARY:NurSummary
END:VEVENT
BEGIN:VEVENT
DTSTART;VALUE=DATE:20260601
END:VEVENT
BEGIN:VEVENT
SUMMARY:Ok
DTSTART;VALUE=DATE:20260601
END:VEVENT
END:VCALENDAR`;
    const events = parseIcalFeed(ics);
    expect(events).toHaveLength(1);
    expect(events[0].summary).toBe("Ok");
  });

  it("entfaltet RFC-5545-Continuation-Lines (Whitespace-Prefix)", () => {
    const ics = `BEGIN:VCALENDAR
BEGIN:VEVENT
UID:long-1
SUMMARY:Sehr langer Titel der ueber
  zwei Zeilen geht
DTSTART;VALUE=DATE:20260601
END:VEVENT
END:VCALENDAR`;
    const events = parseIcalFeed(ics);
    expect(events[0].summary).toBe(
      "Sehr langer Titel der ueber zwei Zeilen geht",
    );
  });

  it("normalisiert Windows-Line-Endings (CRLF)", () => {
    const ics = SAMPLE_ICAL.replace(/\n/g, "\r\n");
    const events = parseIcalFeed(ics);
    expect(events).toHaveLength(2);
  });
});
