// __tests__/components/FeatureGate.test.tsx
// Tests fuer die DB-getriebene FeatureGate-Komponente

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { FeatureGate } from "@/components/FeatureGate";

// --- Mocks ---

// useFeatureFlag aus feature-flags mocken
const mockUseFeatureFlag = vi.fn<() => boolean>();

vi.mock("@/lib/feature-flags", () => ({
  useFeatureFlag: (..._args: unknown[]) => mockUseFeatureFlag(),
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
