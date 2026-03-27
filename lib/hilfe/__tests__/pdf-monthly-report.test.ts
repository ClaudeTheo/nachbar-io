import { describe, it, expect } from "vitest";
import {
  generateMonthlyReport,
  type MonthlyReportData,
} from "../pdf-monthly-report";

describe("pdf-monthly-report", () => {
  const mockData: MonthlyReportData = {
    helperName: "Maria Muster",
    helperAddress: "Musterstr. 1, 79713 Bad Saeckingen",
    seniorName: "Hans Schmidt",
    seniorAddress: "Seniorenweg 5, 79713 Bad Saeckingen",
    insuranceName: "AOK Baden-Wuerttemberg",
    insuranceNumber: "123456789",
    careLevel: 3,
    monthYear: "2026-03",
    sessions: [
      {
        date: "2026-03-05",
        startTime: "10:00",
        endTime: "12:00",
        durationMinutes: 120,
        category: "Einkaufen",
        amountCents: 3000,
      },
      {
        date: "2026-03-12",
        startTime: "14:00",
        endTime: "15:30",
        durationMinutes: 90,
        category: "Begleitung",
        amountCents: 2250,
      },
    ],
    totalAmountCents: 5250,
    hourlyRateCents: 1500,
  };

  it("generates PDF as Uint8Array", () => {
    const pdf = generateMonthlyReport(mockData);
    expect(pdf).toBeInstanceOf(Uint8Array);
    expect(pdf.length).toBeGreaterThan(100);
  });

  it("contains PDF header bytes", () => {
    const pdf = generateMonthlyReport(mockData);
    const header = new TextDecoder().decode(pdf.slice(0, 5));
    expect(header).toBe("%PDF-");
  });
});
