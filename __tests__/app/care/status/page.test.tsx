import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import React from "react";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("lucide-react", () => ({
  Heart: (props: Record<string, unknown>) => <svg {...props} />,
  Video: (props: Record<string, unknown>) => <svg {...props} />,
  MessageCircle: (props: Record<string, unknown>) => <svg {...props} />,
  Clock: (props: Record<string, unknown>) => <svg {...props} />,
  AlertTriangle: (props: Record<string, unknown>) => <svg {...props} />,
  ShieldCheck: (props: Record<string, unknown>) => <svg {...props} />,
  Activity: (props: Record<string, unknown>) => <svg {...props} />,
  Phone: (props: Record<string, unknown>) => <svg {...props} />,
  ArrowLeft: (props: Record<string, unknown>) => <svg {...props} />,
}));

vi.mock("@/components/ui/card", () => ({
  Card: ({
    children,
    ...props
  }: {
    children: React.ReactNode;
    [key: string]: unknown;
  }) => <div {...props}>{children}</div>,
  CardContent: ({
    children,
    ...props
  }: {
    children: React.ReactNode;
    [key: string]: unknown;
  }) => <div {...props}>{children}</div>,
}));

vi.mock("@/components/ui/page-header", () => ({
  PageHeader: ({ title }: { title: string }) => (
    <div data-testid="page-header">{title}</div>
  ),
}));

vi.mock("@/components/illustrations/IllustrationRenderer", () => ({
  IllustrationRenderer: () => <div data-testid="illustration" />,
}));

vi.mock("@/lib/haptics", () => ({ haptic: vi.fn() }));

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ user: { id: "caregiver-001" }, loading: false }),
}));

// Supabase mock — 1 verbundener Bewohner mit Heartbeat vor 2 Stunden + Check-in "gut"
const twoHoursAgo = new Date(Date.now() - 2 * 3600000).toISOString();
const today = new Date().toISOString().split("T")[0];

// Flexible Chain-Factory: jede Methode gibt eine neue Chain zurueck, terminiert mit Promise
function makeChain(result: { data: unknown; error: unknown }) {
  const terminalResult = Promise.resolve(result);
  const chain: Record<string, unknown> = {};
  const methods = [
    "select",
    "eq",
    "in",
    "is",
    "gte",
    "lte",
    "order",
    "limit",
    "not",
    "gt",
    "lt",
    "maybeSingle",
    "single",
  ];
  for (const m of methods) {
    chain[m] = vi.fn(() => chain);
  }
  chain.then = terminalResult.then.bind(terminalResult);
  (chain as Record<string, unknown>)["catch"] =
    terminalResult.catch.bind(terminalResult);
  return chain;
}

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    from: (table: string) => {
      if (table === "caregiver_links") {
        return makeChain({ data: [{ resident_id: "res-1" }], error: null });
      }
      if (table === "users") {
        return makeChain({
          data: [{ id: "res-1", display_name: "Oma Helga", avatar_url: null }],
          error: null,
        });
      }
      if (table === "heartbeats") {
        return makeChain({ data: [{ created_at: twoHoursAgo }], error: null });
      }
      if (table === "checkins") {
        return makeChain({
          data: [{ status: "good", created_at: `${today}T08:00:00Z` }],
          error: null,
        });
      }
      if (table === "appointments") {
        return makeChain({ data: [], error: null });
      }
      return makeChain({ data: [], error: null });
    },
  }),
}));

import CareStatusPage from "@/app/(app)/care/status/page";

beforeEach(() => vi.clearAllMocks());
afterEach(() => cleanup());

describe("CareStatusPage", () => {
  it("rendert die Seite", async () => {
    render(<CareStatusPage />);
    await waitFor(() => {
      expect(screen.getByTestId("care-status-page")).toBeInTheDocument();
    });
  });

  it("zeigt Datenschutz-Hinweis", async () => {
    render(<CareStatusPage />);
    await waitFor(() => {
      expect(screen.getByTestId("privacy-notice")).toBeInTheDocument();
      expect(screen.getByText(/nur den Status/)).toBeInTheDocument();
    });
  });

  it("zeigt verbundenen Bewohner mit Name", async () => {
    render(<CareStatusPage />);
    await waitFor(() => {
      const residents = screen.getAllByTestId("resident-res-1");
      expect(residents.length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("Oma Helga").length).toBeGreaterThanOrEqual(1);
    });
  });

  it('zeigt Heartbeat-Status als "Aktiv"', async () => {
    render(<CareStatusPage />);
    await waitFor(() => {
      expect(screen.getAllByText("Aktiv").length).toBeGreaterThanOrEqual(1);
    });
  });

  it("zeigt Check-in Status (Gut)", async () => {
    render(<CareStatusPage />);
    await waitFor(() => {
      const checkins = screen.getAllByTestId("checkin-status-res-1");
      expect(checkins.length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("Gut").length).toBeGreaterThanOrEqual(1);
    });
  });

  it("hat Video-Anruf und Nachricht Buttons", async () => {
    render(<CareStatusPage />);
    await waitFor(() => {
      expect(
        screen.getAllByTestId("video-call-res-1").length,
      ).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByTestId("chat-res-1").length).toBeGreaterThanOrEqual(
        1,
      );
    });
  });

  it("zeigt KEINE Inhalte (Datenschutz)", async () => {
    render(<CareStatusPage />);
    await waitFor(() => {
      // Button-Label "Nachricht" ist OK
      expect(screen.queryAllByText(/Nachricht/i).length).toBeGreaterThanOrEqual(
        1,
      );
      // Keine Bewohner-spezifischen Inhalte, Standortdaten oder Medikamentennamen
      expect(screen.queryByText(/Medikament/)).toBeNull();
      // Datenschutz-Hinweis erklaert, was NICHT sichtbar ist — das ist korrekt
      expect(screen.getByTestId("privacy-notice")).toBeInTheDocument();
    });
  });
});
