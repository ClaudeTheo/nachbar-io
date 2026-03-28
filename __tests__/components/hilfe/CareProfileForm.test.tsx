import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  cleanup,
  waitFor,
} from "@testing-library/react";
import { CareProfileForm } from "@/components/hilfe/CareProfileForm";

// Globaler Fetch-Mock
let mockFetch: ReturnType<typeof vi.fn>;

beforeEach(() => {
  mockFetch = vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ id: "cp-1" }),
  });
  globalThis.fetch = mockFetch as unknown as typeof fetch;
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("CareProfileForm", () => {
  it("zeigt alle Pflichtfelder an (Pflegegrad, Pflegekasse, Versichertennummer)", () => {
    render(<CareProfileForm />);

    expect(screen.getByLabelText("Pflegegrad")).toBeInTheDocument();
    expect(screen.getByLabelText("Pflegekasse")).toBeInTheDocument();
    expect(screen.getByLabelText("Versichertennummer")).toBeInTheDocument();
  });

  it("zeigt den Entlastungsbetrag von 131 EUR an", () => {
    render(<CareProfileForm />);

    const matches = screen.getAllByText(/131 EUR/);
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it("sendet korrekte Daten beim Absenden", async () => {
    const onSaved = vi.fn();
    render(<CareProfileForm onSaved={onSaved} />);

    // Pflegegrad 3 waehlen
    fireEvent.change(screen.getByLabelText("Pflegegrad"), {
      target: { value: "3" },
    });

    // Pflegekasse AOK waehlen
    fireEvent.change(screen.getByLabelText("Pflegekasse"), {
      target: { value: "AOK" },
    });

    // Versichertennummer eingeben
    fireEvent.change(screen.getByLabelText("Versichertennummer"), {
      target: { value: "A123456789" },
    });

    // Absenden
    fireEvent.click(screen.getByRole("button", { name: /Speichern/ }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith("/api/hilfe/care-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          care_level: 3,
          insurance_name: "AOK",
          insurance_number: "A123456789",
        }),
      });
    });

    await waitFor(() => {
      expect(onSaved).toHaveBeenCalledWith({
        care_level: 3,
        insurance_name: "AOK",
        insurance_number: "A123456789",
      });
    });
  });

  it("zeigt den Datenschutz-Hinweis an", () => {
    render(<CareProfileForm />);

    expect(
      screen.getByText(
        /Daten nur für PDF-Quittung, nie an Dritte weitergegeben/,
      ),
    ).toBeInTheDocument();
  });
});
