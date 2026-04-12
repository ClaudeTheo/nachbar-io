// Tests fuer Termine-Seite (E-3)
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import TerminePage from "./page";

// Mock useCircleEvents
const mockUseCircleEvents = vi.fn();
vi.mock("@/lib/care/hooks/useCircleEvents", () => ({
  useCircleEvents: () => mockUseCircleEvents(),
}));

// Mock next/link
vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

const makeEvent = (overrides = {}) => ({
  id: "evt-1",
  resident_id: "user-1",
  created_by: "user-1",
  scheduled_at: new Date().toISOString(),
  title: "Arztbesuch",
  who_comes: "Petra",
  description: "Blutdruck",
  created_at: "2026-04-12T18:00:00Z",
  deleted_at: null,
  ...overrides,
});

describe("TerminePage", () => {
  it("zeigt Loading-Zustand", () => {
    mockUseCircleEvents.mockReturnValue({
      events: [],
      loading: true,
      error: null,
      refetch: vi.fn(),
    });
    const { container } = render(<TerminePage />);
    expect(container.querySelector(".animate-pulse")).toBeTruthy();
  });

  it("zeigt leeren Zustand", () => {
    mockUseCircleEvents.mockReturnValue({
      events: [],
      loading: false,
      error: null,
      refetch: vi.fn(),
    });
    render(<TerminePage />);
    expect(screen.getByText("Keine Termine geplant")).toBeTruthy();
  });

  it("zeigt Fehler", () => {
    mockUseCircleEvents.mockReturnValue({
      events: [],
      loading: false,
      error: "Netzwerkfehler",
      refetch: vi.fn(),
    });
    render(<TerminePage />);
    expect(screen.getByText("Netzwerkfehler")).toBeTruthy();
  });

  it("zeigt Termin in Heute-Sektion", () => {
    const todayEvent = makeEvent({
      title: "Arztbesuch heute",
      scheduled_at: new Date().toISOString(),
    });
    mockUseCircleEvents.mockReturnValue({
      events: [todayEvent],
      loading: false,
      error: null,
      refetch: vi.fn(),
    });
    render(<TerminePage />);
    expect(screen.getByText("Arztbesuch heute")).toBeTruthy();
    expect(screen.getByText("Heute")).toBeTruthy();
  });

  it("zeigt Spaeter-Sektion fuer zukuenftige Termine", () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 14);
    const futureEvent = makeEvent({
      title: "Zahnarzt",
      scheduled_at: futureDate.toISOString(),
    });
    mockUseCircleEvents.mockReturnValue({
      events: [futureEvent],
      loading: false,
      error: null,
      refetch: vi.fn(),
    });
    render(<TerminePage />);
    expect(screen.getByText("Zahnarzt")).toBeTruthy();
    expect(screen.getByText("Spaeter")).toBeTruthy();
  });

  it("zeigt who_comes und description", () => {
    mockUseCircleEvents.mockReturnValue({
      events: [makeEvent()],
      loading: false,
      error: null,
      refetch: vi.fn(),
    });
    render(<TerminePage />);
    expect(screen.getAllByText(/Petra/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Blutdruck/).length).toBeGreaterThanOrEqual(1);
  });
});
