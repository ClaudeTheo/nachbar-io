import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import GedaechtnisPage from "@/app/(app)/einstellungen/gedaechtnis/page";

const mockUseMemoryFacts = vi.fn();

vi.mock("@/modules/memory/hooks/useMemoryFacts", () => ({
  useMemoryFacts: () => mockUseMemoryFacts(),
}));

vi.mock("@/modules/memory/components/MemoryFactList", () => ({
  MemoryFactList: () => <div data-testid="memory-fact-list" />,
}));

describe("GedaechtnisPage settings copy", () => {
  beforeEach(() => {
    mockUseMemoryFacts.mockReturnValue({
      facts: [],
      consents: [],
      loading: false,
      deleteFact: vi.fn(),
      updateFact: vi.fn(),
      resetFacts: vi.fn(),
      reload: vi.fn(),
    });
  });

  afterEach(() => cleanup());

  it("erklaert KI-Gedaechtnis als freiwillig und nicht noetig fuer die App", () => {
    render(<GedaechtnisPage />);

    expect(screen.getByText(/freiwillig/i)).toBeInTheDocument();
    expect(screen.getByText(/ohne ki-ged[aä]chtnis/i)).toBeInTheDocument();
    expect(screen.getByText(/funktioniert.*weiter/i)).toBeInTheDocument();
  });
});
