import { describe, it, expect } from "vitest";
import { parseCsvWasteDates } from "@/lib/waste/csv-connector";

describe("parseCsvWasteDates", () => {
  it("parst Semikolon-getrennte CSV", () => {
    const csv = `Datum;Muellart;Hinweis
2026-04-02;Restmüll;
2026-04-03;Biotonne;ab 6 Uhr bereitstellen`;

    const result = parseCsvWasteDates(csv);
    expect(result.dates).toHaveLength(2);
    expect(result.errors).toHaveLength(0);
    expect(result.dates[0]).toMatchObject({
      waste_type: "restmuell",
      collection_date: "2026-04-02",
    });
    expect(result.dates[1]).toMatchObject({
      waste_type: "biomuell",
      collection_date: "2026-04-03",
      notes: "ab 6 Uhr bereitstellen",
    });
  });

  it("parst Komma-getrennte CSV", () => {
    const csv = `Datum,Muellart,Hinweis
2026-04-02,Papier,`;

    const result = parseCsvWasteDates(csv);
    expect(result.dates).toHaveLength(1);
    expect(result.dates[0].waste_type).toBe("papier");
  });

  it("parst DD.MM.YYYY Datumsformat", () => {
    const csv = `Datum;Muellart;Hinweis
02.04.2026;Gelber Sack;`;

    const result = parseCsvWasteDates(csv);
    expect(result.dates).toHaveLength(1);
    expect(result.dates[0].collection_date).toBe("2026-04-02");
  });

  it("parst DD/MM/YYYY Datumsformat", () => {
    const csv = `Datum;Muellart;Hinweis
02/04/2026;Grünschnitt;`;

    const result = parseCsvWasteDates(csv);
    expect(result.dates).toHaveLength(1);
    expect(result.dates[0].collection_date).toBe("2026-04-02");
  });

  it("meldet Fehler bei unbekanntem Muelltyp", () => {
    const csv = `Datum;Muellart;Hinweis
2026-04-02;Weihnachtsbaum;`;

    const result = parseCsvWasteDates(csv);
    expect(result.dates).toHaveLength(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain("Weihnachtsbaum");
  });

  it("meldet Fehler bei ungueltigem Datum", () => {
    const csv = `Datum;Muellart;Hinweis
nicht-ein-datum;Restmüll;`;

    const result = parseCsvWasteDates(csv);
    expect(result.dates).toHaveLength(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain("Ungültiges Datum");
  });

  it("behandelt leere CSV", () => {
    const result = parseCsvWasteDates("Header");
    expect(result.dates).toHaveLength(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain("leer");
  });

  it("ueberspringt leere Zeilen", () => {
    const csv = `Datum;Muellart;Hinweis
2026-04-02;Restmüll;

2026-04-03;Biotonne;`;

    const result = parseCsvWasteDates(csv);
    expect(result.dates).toHaveLength(2);
  });

  it("entfernt Anfuehrungszeichen", () => {
    const csv = `Datum;Muellart;Hinweis
"2026-04-02";"Restmüll";"Hinweis"`;

    const result = parseCsvWasteDates(csv);
    expect(result.dates).toHaveLength(1);
    expect(result.dates[0].waste_type).toBe("restmuell");
    expect(result.dates[0].notes).toBe("Hinweis");
  });
});
