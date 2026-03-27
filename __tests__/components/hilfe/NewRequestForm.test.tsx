import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  cleanup,
  waitFor,
} from "@testing-library/react";
import { NewRequestForm } from "@/components/hilfe/NewRequestForm";

// useQuarter Mock — simuliert ein aktives Quartier
vi.mock("@/lib/quarters/quarter-context", () => ({
  useQuarter: () => ({
    currentQuarter: { id: "q-test-001", name: "Testquartier" },
    quarters: [{ id: "q-test-001", name: "Testquartier" }],
    setCurrentQuarter: vi.fn(),
  }),
}));

let mockFetch: ReturnType<typeof vi.fn>;

beforeEach(() => {
  mockFetch = vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ id: "req-new" }),
  });
  globalThis.fetch = mockFetch as unknown as typeof fetch;
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("NewRequestForm", () => {
  it("zeigt alle 7 Kategorie-Kacheln an", () => {
    render(<NewRequestForm />);

    const tiles = screen.getAllByRole("radio");
    expect(tiles).toHaveLength(7);

    // Prüfe einige Labels
    expect(screen.getByText("Einkaufen")).toBeInTheDocument();
    expect(screen.getByText("Technik")).toBeInTheDocument();
    expect(screen.getByText("Sonstiges")).toBeInTheDocument();
  });

  it("sendet korrekte Daten beim Absenden", async () => {
    const onSuccess = vi.fn();
    render(<NewRequestForm onSuccess={onSuccess} />);

    // Kategorie wählen
    fireEvent.click(screen.getByText("Einkaufen"));

    // Beschreibung eingeben
    fireEvent.change(screen.getByLabelText("Beschreibung"), {
      target: { value: "Wocheneinkauf bitte" },
    });

    // Absenden
    fireEvent.click(screen.getByRole("button", { name: /Gesuch aufgeben/ }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith("/api/hilfe/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quarter_id: "q-test-001",
          category: "einkaufen",
          description: "Wocheneinkauf bitte",
          preferred_time: null,
        }),
      });
    });

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it("zeigt die Beschreibung-Textarea an", () => {
    render(<NewRequestForm />);

    const textarea = screen.getByLabelText("Beschreibung");
    expect(textarea).toBeInTheDocument();
    expect(textarea.tagName.toLowerCase()).toBe("textarea");
  });
});
