// __tests__/components/FeatureGate.test.tsx
// Tests fuer die DB-getriebene FeatureGate-Komponente

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { FeatureGate } from "@/components/FeatureGate";
import type { ComponentProps } from "react";

// --- Mocks ---

// useFeatureFlag aus feature-flags mocken
const mockUseFeatureFlag = vi.fn();

vi.mock("@/lib/feature-flags", () => ({
  useFeatureFlag: (...args: unknown[]) => mockUseFeatureFlag(...args),
}));

const mockUseQuarter = vi.fn(() => ({
  currentQuarter: { id: "quarter-a" },
  allQuarters: [],
  loading: false,
  switchQuarter: vi.fn(),
  refreshQuarter: vi.fn(),
}));

vi.mock("@/lib/quarters", () => ({
  useQuarter: () => mockUseQuarter(),
}));

// useUserRole mocken
vi.mock("@/lib/quarters/hooks", () => ({
  useUserRole: () => ({
    role: "user",
    loading: false,
    isSuperAdmin: false,
    isQuarterAdmin: false,
    isAdmin: false,
  }),
}));

// useSubscription mocken
vi.mock("@/lib/care/hooks/useSubscription", () => ({
  useSubscription: () => ({
    subscription: { plan: "free" },
    loading: false,
  }),
}));

// --- Tests ---

describe("FeatureGate (DB-getrieben)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseQuarter.mockReturnValue({
      currentQuarter: { id: "quarter-a" },
      allQuarters: [],
      loading: false,
      switchQuarter: vi.fn(),
      refreshQuarter: vi.fn(),
    });
  });

  afterEach(() => {
    cleanup();
  });

  it("rendert children wenn Feature-Flag aktiv ist", () => {
    mockUseFeatureFlag.mockReturnValue(true);

    render(
      <FeatureGate feature="BOARD_ENABLED">
        <div data-testid="content">Schwarzes Brett</div>
      </FeatureGate>,
    );

    expect(screen.getByTestId("content")).toBeDefined();
    expect(screen.getByText("Schwarzes Brett")).toBeDefined();
    expect(mockUseFeatureFlag).toHaveBeenCalledWith("BOARD_ENABLED", {
      role: "user",
      plan: "free",
      quarter_id: "quarter-a",
    });
  });

  it("ignoriert einen manipulierten quarterId-Prop und nutzt den geladenen Quartier-Kontext", () => {
    mockUseFeatureFlag.mockReturnValue(true);
    const props = {
      feature: "BOARD_ENABLED",
      quarterId: "quarter-forged",
      children: <div data-testid="content">Schwarzes Brett</div>,
    } as unknown as ComponentProps<typeof FeatureGate>;

    render(<FeatureGate {...props} />);

    expect(mockUseFeatureFlag).toHaveBeenCalledWith("BOARD_ENABLED", {
      role: "user",
      plan: "free",
      quarter_id: "quarter-a",
    });
  });

  it("rendert Fallback wenn Feature-Flag inaktiv ist", () => {
    mockUseFeatureFlag.mockReturnValue(false);

    render(
      <FeatureGate
        feature="BOARD_ENABLED"
        fallback={<div data-testid="fallback">Nicht verfuegbar</div>}
      >
        <div data-testid="content">Schwarzes Brett</div>
      </FeatureGate>,
    );

    expect(screen.queryByTestId("content")).toBeNull();
    expect(screen.getByTestId("fallback")).toBeDefined();
    expect(screen.getByText("Nicht verfuegbar")).toBeDefined();
  });

  it("rendert nichts wenn Flag inaktiv und kein Fallback angegeben", () => {
    mockUseFeatureFlag.mockReturnValue(false);

    const { container } = render(
      <FeatureGate feature="BOARD_ENABLED">
        <div data-testid="content">Schwarzes Brett</div>
      </FeatureGate>,
    );

    expect(screen.queryByTestId("content")).toBeNull();
    // Container sollte leer sein (nur leerer Wrapper)
    expect(container.innerHTML).toBe("");
  });
});
