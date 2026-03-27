// Nachbar Hilfe — Jahresabrechnung Helfer-PDF Tests
import { describe, it, expect } from "vitest";
import {
  generateYearlyHelperReport,
  type YearlyHelperData,
} from "@/lib/hilfe/pdf-yearly-helper";

const MOCK_DATA: YearlyHelperData = {
  year: 2026,
  helper: {
    name: "Max Mustermann",
    address: "Musterstr. 1, 79713 Bad Saeckingen",
    dateOfBirth: "1990-05-15",
    federalState: "BW",
  },
  clients: [
    {
      displayName: "Maria S.",
      sessions: [
        {
          date: "2026-01-15",
          startTime: "09:00",
          endTime: "10:00",
          durationMinutes: 60,
          category: "Einkaufen",
          amountCents: 1500,
        },
        {
          date: "2026-02-20",
          startTime: "14:00",
          endTime: "15:30",
          durationMinutes: 90,
          category: "Haushalt",
          amountCents: 2250,
        },
      ],
      subtotalCents: 3750,
    },
  ],
  totalAmountCents: 3750,
  totalSessions: 2,
  totalClients: 1,
  averageHourlyRateCents: 1500,
  taxNote: "Steuerfrei bis 3.000 EUR/Jahr (Uebungsleiterfreibetrag)",
  exceedsFreibetrag: true,
};

describe("pdf-yearly-helper", () => {
  it("generiert ein PDF als Uint8Array", () => {
    const pdf = generateYearlyHelperReport(MOCK_DATA);
    expect(pdf).toBeInstanceOf(Uint8Array);
    expect(pdf.length).toBeGreaterThan(100);
  });

  it("PDF beginnt mit %PDF Header", () => {
    const pdf = generateYearlyHelperReport(MOCK_DATA);
    const header = new TextDecoder().decode(pdf.slice(0, 5));
    expect(header).toBe("%PDF-");
  });

  it("funktioniert mit leerem clients-Array", () => {
    const empty = {
      ...MOCK_DATA,
      clients: [],
      totalAmountCents: 0,
      totalSessions: 0,
      totalClients: 0,
    };
    const pdf = generateYearlyHelperReport(empty);
    expect(pdf).toBeInstanceOf(Uint8Array);
  });
});
