// __tests__/app/senior/meine-termine.test.tsx
// Welle F3-Folge (Befund C2:5): Termine in der Senior-Shell. Der kreis-start-
// "Termine"-Link fuehrte bisher auf /mein-kreis/termine in der (app)-Shell (kein
// 112-Footer, kleine Touch-Targets). /meine-termine rendert dieselben kommenden
// Termine (RLS-scoped via useCircleEvents) innerhalb der (senior)-Shell.

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

const useCircleEventsMock = vi.fn();
vi.mock("@/lib/care/hooks/useCircleEvents", () => ({
  useCircleEvents: () => useCircleEventsMock(),
}));

import SeniorMeineTerminePage from "@/app/(senior)/meine-termine/page";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const makeEvent = (overrides = {}) => ({
  id: "evt-1",
  resident_id: "user-1",
  created_by: "user-1",
  scheduled_at: new Date("2026-07-01T14:00:00Z").toISOString(),
  title: "Arztbesuch",
  who_comes: "Petra",
  description: "Blutdruck messen",
  created_at: "2026-06-12T18:00:00Z",
  deleted_at: null,
  ...overrides,
});

describe("Senior /meine-termine — Termine in der Senior-Shell (F3-Folge)", () => {
  it("zeigt kommende Termine des Bewohners mit Titel und Detail", () => {
    useCircleEventsMock.mockReturnValue({
      events: [makeEvent()],
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<SeniorMeineTerminePage />);

    expect(screen.getByText("Arztbesuch")).toBeInTheDocument();
    expect(screen.getByText(/Petra/)).toBeInTheDocument();
    expect(screen.getByText(/Blutdruck messen/)).toBeInTheDocument();
  });

  it("bietet einen Zurueck-Weg zur Startseite", () => {
    useCircleEventsMock.mockReturnValue({
      events: [],
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<SeniorMeineTerminePage />);

    const back = screen.getByRole("link", { name: /startseite/i });
    expect(back.getAttribute("href")).toBe("/kreis-start");
  });

  it("zeigt einen freundlichen Leerzustand, wenn keine Termine geplant sind", () => {
    useCircleEventsMock.mockReturnValue({
      events: [],
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<SeniorMeineTerminePage />);

    expect(screen.getByText(/keine termine/i)).toBeInTheDocument();
  });

  it("zeigt einen Ladezustand", () => {
    useCircleEventsMock.mockReturnValue({
      events: [],
      loading: true,
      error: null,
      refetch: vi.fn(),
    });

    render(<SeniorMeineTerminePage />);

    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("zeigt einen ruhigen Fehlerhinweis", () => {
    useCircleEventsMock.mockReturnValue({
      events: [],
      loading: false,
      error: "Termine konnten nicht geladen werden",
      refetch: vi.fn(),
    });

    render(<SeniorMeineTerminePage />);

    expect(screen.getByRole("alert")).toBeInTheDocument();
  });
});
