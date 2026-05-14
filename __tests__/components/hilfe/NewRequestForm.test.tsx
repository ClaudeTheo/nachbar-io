import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  cleanup,
  waitFor,
  within,
} from "@testing-library/react";
import { NewRequestForm } from "@/modules/hilfe/components/NewRequestForm";

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

    const categoryGroup = screen.getByRole("group", {
      name: /Wobei brauchen Sie Hilfe/i,
    });
    const tiles = within(categoryGroup).getAllByRole("radio");
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
          category: "shopping",
          title: "Einkaufen gesucht",
          description: "Wocheneinkauf bitte",
          recognition_type: "free",
          suggested_recognition_cents: null,
          type: "need",
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

  it("zeigt freiwillige Anerkennung mit Pflicht-Hinweis", () => {
    render(<NewRequestForm />);

    expect(screen.getByText("Freiwillige Anerkennung")).toBeInTheDocument();
    expect(screen.getByText(/nimmt keine Zahlungen entgegen/i)).toBeInTheDocument();
  });
});
