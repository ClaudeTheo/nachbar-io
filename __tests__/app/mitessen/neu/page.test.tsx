import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import NewMealPage from "@/app/(app)/mitessen/neu/page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("@/lib/quarters", () => ({
  useQuarter: () => ({
    currentQuarter: { id: "q-1", name: "Test" },
  }),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    from: () => ({
      insert: () => Promise.resolve({ error: null }),
    }),
    auth: {
      getUser: () => Promise.resolve({ data: { user: { id: "u-1" } } }),
    },
    storage: {
      from: () => ({
        upload: () => Promise.resolve({ error: null }),
        getPublicUrl: () => ({ data: { publicUrl: "https://example.com/img.jpg" } }),
      }),
    },
  }),
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

describe("NewMealPage", () => {
  beforeEach(() => {
    cleanup();
  });

  it("zeigt Schritt 1: Typauswahl", () => {
    render(<NewMealPage />);
    expect(screen.getByTestId("type-portion")).toBeInTheDocument();
    expect(screen.getByTestId("type-invitation")).toBeInTheDocument();
  });

  it("navigiert zu Schritt 2 nach Portion-Auswahl", () => {
    render(<NewMealPage />);
    fireEvent.click(screen.getByTestId("type-portion"));
    expect(screen.getByTestId("input-title")).toBeInTheDocument();
    expect(screen.getByTestId("input-servings")).toBeInTheDocument();
  });

  it("zeigt Abholinfo nur bei Portionen", () => {
    render(<NewMealPage />);
    fireEvent.click(screen.getByTestId("type-portion"));
    expect(screen.getByLabelText("Abholinfo")).toBeInTheDocument();
  });

  it("zeigt kein Abholinfo bei Einladungen", () => {
    render(<NewMealPage />);
    fireEvent.click(screen.getByTestId("type-invitation"));
    expect(screen.queryByLabelText("Abholinfo")).not.toBeInTheDocument();
  });

  it("zeigt Portionen-Label bei Portionen", () => {
    render(<NewMealPage />);
    fireEvent.click(screen.getByTestId("type-portion"));
    expect(screen.getByLabelText("Portionen *")).toBeInTheDocument();
  });

  it("zeigt Plätze-Label bei Einladungen", () => {
    render(<NewMealPage />);
    fireEvent.click(screen.getByTestId("type-invitation"));
    expect(screen.getByLabelText("Plätze *")).toBeInTheDocument();
  });

  it("Weiter-Button mit leerem Titel deaktiviert", () => {
    render(<NewMealPage />);
    fireEvent.click(screen.getByTestId("type-portion"));
    // Titel ist leer, Datum ist automatisch heute bei Portionen
    // Aber Titel fehlt noch → disabled
    fireEvent.change(screen.getByTestId("input-title"), { target: { value: "" } });
    expect(screen.getByTestId("next-button")).toBeDisabled();
  });

  it("Weiter-Button aktiviert mit Titel und Datum", () => {
    render(<NewMealPage />);
    fireEvent.click(screen.getByTestId("type-portion"));
    fireEvent.change(screen.getByTestId("input-title"), { target: { value: "Lasagne" } });
    // Datum ist automatisch heute fuer Portionen
    expect(screen.getByTestId("next-button")).not.toBeDisabled();
  });

  it("navigiert zu Schritt 3 (Vorschau)", () => {
    render(<NewMealPage />);
    fireEvent.click(screen.getByTestId("type-portion"));
    fireEvent.change(screen.getByTestId("input-title"), { target: { value: "Gulasch" } });
    fireEvent.click(screen.getByTestId("next-button"));
    expect(screen.getByTestId("submit-button")).toBeInTheDocument();
    expect(screen.getByText("Gulasch")).toBeInTheDocument();
  });

  it("zeigt Schrittanzeige (3 Balken)", () => {
    const { container } = render(<NewMealPage />);
    const bars = container.querySelectorAll(".rounded-full.h-1");
    expect(bars.length).toBe(3);
  });
});
