import { describe, it, expect } from "vitest";
import { generateHelperCsv, generateResidentCsv } from "@/modules/hilfe/services/csv-yearly";

describe("csv-yearly", () => {
  it("Helfer-CSV: Semikolon-Trennung, Dezimalkomma, BOM", () => {
    const csv = generateHelperCsv([
      {
        date: "2026-01-15",
        clientName: "Maria S.",
        category: "Einkaufen",
        durationMinutes: 60,
        hourlyRateEur: "15,00",
        amountEur: "15,00",
      },
    ]);
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain(
      "Datum;Klient;Kategorie;Dauer_Min;Stundensatz_EUR;Betrag_EUR",
    );
    expect(csv).toContain("15.01.2026;Maria S.;Einkaufen;60;15,00;15,00");
  });

  it("Pflegebeduerftigen-CSV: mit Helfer-Adresse", () => {
    const csv = generateResidentCsv([
      {
        date: "2026-01-15",
        helperName: "Max Mustermann",
        helperAddress: "Musterstr. 1",
        category: "Einkaufen",
        durationMinutes: 60,
        hourlyRateEur: "15,00",
        amountEur: "15,00",
      },
    ]);
    expect(csv).toContain("Helfer_Adresse");
    expect(csv).toContain("Musterstr. 1");
  });

  it("leeres Array ergibt nur Header", () => {
    const csv = generateHelperCsv([]);
    const lines = csv.trim().split("\n");
    expect(lines.length).toBe(1);
  });
});
