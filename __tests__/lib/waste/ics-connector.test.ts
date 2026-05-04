import { afterEach, describe, it, expect, vi } from "vitest";
import { checkIcsHealth, fetchIcsWasteDates } from "@/lib/waste/ics-connector";

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
  afterEach(() => {
    vi.unstubAllGlobals();
  });

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

  it("blockt lokale URL-Ziele vor dem Fetch", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchIcsWasteDates({
      url: "https://127.0.0.1/internal.ics",
    });

    expect(result.success).toBe(false);
    expect(result.errors[0]).toContain("keine gueltige externe URL");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("blockt Link-Local Metadata-URLs vor dem Fetch", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchIcsWasteDates({
      url: "https://169.254.169.254/latest/meta-data",
    });

    expect(result.success).toBe(false);
    expect(result.errors[0]).toContain("keine gueltige externe URL");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("fetches externe HTTPS-URLs nach Validierung", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: vi.fn().mockResolvedValue(SAMPLE_ICS),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchIcsWasteDates({
      url: "https://awb.example.org/calendar.ics",
    });

    expect(result.success).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("checkIcsHealth", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("blockt interne URL-Ziele vor dem HEAD-Fetch", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await checkIcsHealth("https://192.168.0.10/calendar.ics");

    expect(result.ok).toBe(false);
    expect(result.error).toContain("keine gueltige externe URL");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
