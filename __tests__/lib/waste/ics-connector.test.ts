import { describe, it, expect } from "vitest";
import { fetchIcsWasteDates } from "@/lib/waste/ics-connector";

// Minimales ICS-Format fuer Tests
const SAMPLE_ICS = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//Test//DE
BEGIN:VEVENT
DTSTART;VALUE=DATE:20260402
SUMMARY:Restmüll
DESCRIPTION:Bitte ab 6:00 Uhr bereitstellen
END:VEVENT
BEGIN:VEVENT
DTSTART;VALUE=DATE:20260403
SUMMARY:Biotonne (14-tägl.)
END:VEVENT
BEGIN:VEVENT
DTSTART;VALUE=DATE:20260410
SUMMARY:Gelber Sack - Abholung
END:VEVENT
BEGIN:VEVENT
DTSTART;VALUE=DATE:20260415
SUMMARY:Weihnachtsbaum
END:VEVENT
END:VCALENDAR`;

describe("fetchIcsWasteDates", () => {
  it("parst ICS-Inhalt korrekt", async () => {
    const result = await fetchIcsWasteDates({ file_content: SAMPLE_ICS });

    expect(result.success).toBe(true);
    expect(result.dates).toHaveLength(3);
    expect(result.skipped).toBe(1); // Weihnachtsbaum
    expect(result.total_events).toBe(4);
  });

  it("extrahiert Muelltypen korrekt", async () => {
    const result = await fetchIcsWasteDates({ file_content: SAMPLE_ICS });

    const types = result.dates.map((d) => d.waste_type);
    expect(types).toContain("restmuell");
    expect(types).toContain("biomuell");
    expect(types).toContain("gelber_sack");
  });

  it("extrahiert Daten korrekt", async () => {
    const result = await fetchIcsWasteDates({ file_content: SAMPLE_ICS });

    const restmuell = result.dates.find((d) => d.waste_type === "restmuell");
    expect(restmuell?.collection_date).toBe("2026-04-02");
  });

  it("extrahiert Zeithinweis aus Description", async () => {
    const result = await fetchIcsWasteDates({ file_content: SAMPLE_ICS });

    const restmuell = result.dates.find((d) => d.waste_type === "restmuell");
    expect(restmuell?.time_hint).toContain("6:00 Uhr");
  });

  it("meldet unbekannte Typen als Fehler", async () => {
    const result = await fetchIcsWasteDates({ file_content: SAMPLE_ICS });

    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain("Weihnachtsbaum");
  });

  it("gibt Fehler ohne URL und Content", async () => {
    const result = await fetchIcsWasteDates({});

    expect(result.success).toBe(false);
    expect(result.errors[0]).toContain("Weder url noch file_content");
  });

  it("behandelt leeren ICS-Inhalt", async () => {
    const result = await fetchIcsWasteDates({
      file_content: "BEGIN:VCALENDAR\nVERSION:2.0\nEND:VCALENDAR",
    });

    expect(result.success).toBe(true);
    expect(result.dates).toHaveLength(0);
    expect(result.total_events).toBe(0);
  });
});
