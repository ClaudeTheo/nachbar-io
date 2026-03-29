// components/care/AppointmentCalendar.test.tsx
// Nachbar.io — Tests für Termin-Kalender

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { AppointmentCalendar } from "./AppointmentCalendar";
import type { CareAppointment } from "@/lib/care/types";

// Lucide-Icons mocken
vi.mock("lucide-react", () => ({
  ChevronLeft: (props: Record<string, unknown>) => (
    <svg data-testid="chevron-left" {...props} />
  ),
  ChevronRight: (props: Record<string, unknown>) => (
    <svg data-testid="chevron-right" {...props} />
  ),
}));

afterEach(() => {
  cleanup();
});

// Hilfsfunktion: Termin erstellen
function makeAppointment(
  overrides: Partial<CareAppointment> = {},
): CareAppointment {
  return {
    id: "appt-1",
    senior_id: "user-1",
    title: "Hausarzt",
    type: "doctor",
    scheduled_at: new Date().toISOString(),
    duration_minutes: 30,
    location: null,
    reminder_minutes_before: [30],
    recurrence: null,
    managed_by: null,
    notes: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("AppointmentCalendar", () => {
  it("zeigt alle Wochentage (Mo bis So)", () => {
    render(<AppointmentCalendar appointments={[]} />);
    expect(screen.getByText("Mo")).toBeInTheDocument();
    expect(screen.getByText("Di")).toBeInTheDocument();
    expect(screen.getByText("Mi")).toBeInTheDocument();
    expect(screen.getByText("Do")).toBeInTheDocument();
    expect(screen.getByText("Fr")).toBeInTheDocument();
    expect(screen.getByText("Sa")).toBeInTheDocument();
    expect(screen.getByText("So")).toBeInTheDocument();
  });

  it("zeigt Monatsnavigation (Vorheriger/Nächster)", () => {
    render(<AppointmentCalendar appointments={[]} />);
    expect(screen.getByLabelText("Vorheriger Monat")).toBeInTheDocument();
    expect(screen.getByLabelText("Nächster Monat")).toBeInTheDocument();
  });

  it("zeigt aktuelles Jahr in der Überschrift", () => {
    render(<AppointmentCalendar appointments={[]} />);
    const year = new Date().getFullYear().toString();
    expect(screen.getByText(new RegExp(year))).toBeInTheDocument();
  });

  it("zeigt aktuellen Monat in der Überschrift", () => {
    render(<AppointmentCalendar appointments={[]} />);
    const monthNames = [
      "Januar",
      "Februar",
      "März",
      "April",
      "Mai",
      "Juni",
      "Juli",
      "August",
      "September",
      "Oktober",
      "November",
      "Dezember",
    ];
    const currentMonth = monthNames[new Date().getMonth()];
    expect(screen.getByText(new RegExp(currentMonth))).toBeInTheDocument();
  });

  it("navigiert zum nächsten Monat", () => {
    render(<AppointmentCalendar appointments={[]} />);
    const nextButton = screen.getByLabelText("Nächster Monat");
    const monthNames = [
      "Januar",
      "Februar",
      "März",
      "April",
      "Mai",
      "Juni",
      "Juli",
      "August",
      "September",
      "Oktober",
      "November",
      "Dezember",
    ];

    fireEvent.click(nextButton);

    const nextMonth = new Date();
    nextMonth.setDate(1); // Tag auf 1 setzen um Monats-Overflow zu vermeiden
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    const expectedMonth = monthNames[nextMonth.getMonth()];
    expect(screen.getByText(new RegExp(expectedMonth))).toBeInTheDocument();
  });

  it("navigiert zum vorherigen Monat", () => {
    render(<AppointmentCalendar appointments={[]} />);
    const prevButton = screen.getByLabelText("Vorheriger Monat");
    const monthNames = [
      "Januar",
      "Februar",
      "März",
      "April",
      "Mai",
      "Juni",
      "Juli",
      "August",
      "September",
      "Oktober",
      "November",
      "Dezember",
    ];

    fireEvent.click(prevButton);

    const prevMonth = new Date();
    prevMonth.setDate(1); // Tag auf 1 setzen um Monats-Overflow zu vermeiden
    prevMonth.setMonth(prevMonth.getMonth() - 1);
    const expectedMonth = monthNames[prevMonth.getMonth()];
    expect(screen.getByText(new RegExp(expectedMonth))).toBeInTheDocument();
  });

  it('zeigt heutige Termine im "Heute"-Bereich', () => {
    const todayAppt = makeAppointment({
      title: "Physiotherapie",
      type: "therapy",
      scheduled_at: new Date().toISOString(),
    });

    render(<AppointmentCalendar appointments={[todayAppt]} />);
    expect(screen.getByText("Heute")).toBeInTheDocument();
    expect(screen.getByText("Physiotherapie")).toBeInTheDocument();
  });

  it('zeigt KEINEN "Heute"-Bereich ohne heutige Termine', () => {
    render(<AppointmentCalendar appointments={[]} />);
    expect(screen.queryByText("Heute")).not.toBeInTheDocument();
  });

  it("Navigation-Buttons haben minHeight 44px (Touch-Target)", () => {
    render(<AppointmentCalendar appointments={[]} />);
    const prevButton = screen.getByLabelText("Vorheriger Monat");
    const nextButton = screen.getByLabelText("Nächster Monat");
    // Prüfe CSS-Klassen statt inline-Style (min-h-[44px] in Tailwind)
    expect(prevButton.className).toContain("min-h-[44px]");
    expect(nextButton.className).toContain("min-h-[44px]");
  });
});
