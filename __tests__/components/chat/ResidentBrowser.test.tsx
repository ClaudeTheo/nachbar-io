// __tests__/components/chat/ResidentBrowser.test.tsx
// Tests fuer die ResidentBrowser Sheet-Komponente

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  waitFor,
  fireEvent,
  cleanup,
} from "@testing-library/react";
import { ResidentBrowser } from "@/components/chat/ResidentBrowser";

// --- Mocks ---

// Globaler fetch-Mock
const mockFetch = vi.fn();
global.fetch = mockFetch;

// sonner toast mock
vi.mock("sonner", () => ({
  toast: Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
  }),
}));

// Sheet-Komponente vereinfacht mocken (base-ui Dialog ist schwer testbar)
vi.mock("@/components/ui/sheet", () => ({
  Sheet: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div data-testid="sheet">{children}</div> : null,
  SheetContent: ({
    children,
  }: {
    children: React.ReactNode;
    side?: string;
    className?: string;
  }) => <div data-testid="sheet-content">{children}</div>,
  SheetHeader: ({
    children,
    className: _className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => <div>{children}</div>,
  SheetTitle: ({
    children,
    className: _className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => <h2>{children}</h2>,
  SheetDescription: ({
    children,
    className: _className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => <p>{children}</p>,
}));

// --- Testdaten ---

const mockAddresses = {
  addresses: [
    {
      address: "Purkersdorfer Straße 12",
      householdId: "hh-001",
      residents: [
        { number: 1, id: "abc123" },
        { number: 2, id: "def456" },
      ],
    },
    {
      address: "Sanarystraße 5",
      householdId: "hh-002",
      residents: [{ number: 1, id: "ghi789" }],
    },
  ],
};

// --- Tests ---

describe("ResidentBrowser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("zeigt Ladezustand beim Oeffnen", () => {
    // fetch bleibt haengen (never resolves)
    mockFetch.mockReturnValue(new Promise(() => {}));

    render(
      <ResidentBrowser open={true} onClose={vi.fn()} onRequestSent={vi.fn()} />,
    );

    expect(screen.getByTestId("loading-state")).toBeInTheDocument();
  });

  it("zeigt Adressliste nach erfolgreichem Laden", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockAddresses,
    });

    render(
      <ResidentBrowser open={true} onClose={vi.fn()} onRequestSent={vi.fn()} />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("address-list")).toBeInTheDocument();
    });

    // Zwei Adressen sichtbar
    const addressItems = screen.getAllByTestId("address-item");
    expect(addressItems).toHaveLength(2);
    expect(screen.getByText("Purkersdorfer Straße 12")).toBeInTheDocument();
    expect(screen.getByText("Sanarystraße 5")).toBeInTheDocument();
  });

  it("zeigt leeren Zustand wenn keine Bewohner verfuegbar", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ addresses: [] }),
    });

    render(
      <ResidentBrowser open={true} onClose={vi.fn()} onRequestSent={vi.fn()} />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("empty-state")).toBeInTheDocument();
    });

    expect(
      screen.getByText("Keine Bewohner zum Kontaktieren verfügbar"),
    ).toBeInTheDocument();
  });

  it("zeigt Nachrichtenformular nach Bewohner-Auswahl", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockAddresses,
    });

    render(
      <ResidentBrowser open={true} onClose={vi.fn()} onRequestSent={vi.fn()} />,
    );

    // Warten auf Adressliste
    await waitFor(() => {
      expect(screen.getByTestId("address-list")).toBeInTheDocument();
    });

    // Erste Adresse aufklappen
    fireEvent.click(screen.getAllByTestId("address-item")[0]);

    // Bewohner auswaehlen
    await waitFor(() => {
      expect(screen.getAllByTestId("resident-item").length).toBeGreaterThan(0);
    });
    fireEvent.click(screen.getAllByTestId("resident-item")[0]);

    // Formular pruefen
    await waitFor(() => {
      expect(screen.getByTestId("message-form")).toBeInTheDocument();
    });
    expect(screen.getByTestId("message-textarea")).toBeInTheDocument();
    expect(screen.getByTestId("send-button")).toBeInTheDocument();
  });

  it("deaktiviert Senden-Button wenn Nachricht leer", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockAddresses,
    });

    render(
      <ResidentBrowser open={true} onClose={vi.fn()} onRequestSent={vi.fn()} />,
    );

    // Adressliste laden → Adresse aufklappen → Bewohner waehlen
    await waitFor(() => {
      expect(screen.getByTestId("address-list")).toBeInTheDocument();
    });
    fireEvent.click(screen.getAllByTestId("address-item")[0]);
    await waitFor(() => {
      expect(screen.getAllByTestId("resident-item").length).toBeGreaterThan(0);
    });
    fireEvent.click(screen.getAllByTestId("resident-item")[0]);

    // Warten auf Formular und Senden-Button
    await waitFor(() => {
      expect(screen.getByTestId("message-form")).toBeInTheDocument();
    });
    expect(screen.getByTestId("send-button")).toBeDisabled();
  });
});
