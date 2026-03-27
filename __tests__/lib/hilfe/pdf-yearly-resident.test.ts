import { describe, it, expect } from "vitest";
import {
  generateYearlyResidentReport,
  type YearlyResidentData,
} from "@/lib/hilfe/pdf-yearly-resident";

const MOCK_DATA: YearlyResidentData = {
  year: 2026,
  resident: {
    name: "Maria Schmidt",
    address: "Purkersdorfer Str. 5, 79713 Bad Saeckingen",
    insuranceName: "AOK Baden-Wuerttemberg",
    insuranceNumberMasked: "****4567",
    careLevel: 2,
  },
  helpers: [
    {
      name: "Max Mustermann",
      address: "Musterstr. 1, 79713 Bad Saeckingen",
      sessions: [
        {
          date: "2026-01-15",
          startTime: "09:00",
          endTime: "10:00",
          durationMinutes: 60,
          category: "Einkaufen",
          hourlyRateCents: 1500,
          amountCents: 1500,
        },
        {
          date: "2026-02-20",
          startTime: "14:00",
          endTime: "15:30",
          durationMinutes: 90,
          category: "Haushalt",
          hourlyRateCents: 1500,
          amountCents: 2250,
        },
      ],
      subtotalCents: 3750,
    },
  ],
  totalAmountCents: 3750,
  totalSessions: 2,
  deductibleAmount: "7,50",
};

describe("pdf-yearly-resident", () => {
  it("generiert ein PDF als Uint8Array", () => {
    const pdf = generateYearlyResidentReport(MOCK_DATA);
    expect(pdf).toBeInstanceOf(Uint8Array);
    expect(pdf.length).toBeGreaterThan(100);
  });

  it("PDF beginnt mit %PDF Header", () => {
    const pdf = generateYearlyResidentReport(MOCK_DATA);
    const header = new TextDecoder().decode(pdf.slice(0, 5));
    expect(header).toBe("%PDF-");
  });
});
