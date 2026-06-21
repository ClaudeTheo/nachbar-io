// __tests__/app/praevention/buchen-gate.test.tsx
// C1:5 — Buchungs-Sackgasse: bei deaktiviertem BILLING_ENABLED muss statt des
// Formulars (das im 503 endet) ein ehrlicher Hinweis erscheinen.

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import BuchenPage from "@/app/(app)/praevention/buchen/page";
import BuchenFuerAnderePage from "@/app/(app)/praevention/buchen-fuer-andere/page";
import { isFeatureEnabledClient } from "@/lib/feature-flags";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/lib/feature-flags", () => ({
  isFeatureEnabledClient: vi.fn(),
}));

const mockIsEnabled = vi.mocked(isFeatureEnabledClient);

beforeEach(() => {
  vi.clearAllMocks();
  // Alle API-Fetches liefern leere Listen — der Test prueft nur das Gate.
  global.fetch = vi.fn(async () => ({
    ok: true,
    json: async () => [],
  })) as unknown as typeof fetch;
});

afterEach(() => cleanup());

describe("Praevention /buchen — Billing-Gate (C1:5)", () => {
  it("zeigt ehrlichen Hinweis statt Formular, wenn Buchung deaktiviert ist", async () => {
    mockIsEnabled.mockResolvedValue(false);

    render(<BuchenPage />);

    expect(
      await screen.findByText(/Online-Buchung noch nicht verfügbar/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Zur Kursübersicht/i })).toHaveAttribute(
      "href",
      "/praevention",
    );
    // Kein toter Buchen-Button
    expect(screen.queryByText(/Jetzt buchen/i)).not.toBeInTheDocument();
  });

  it("zeigt das Buchungsformular, wenn Buchung aktiviert ist", async () => {
    mockIsEnabled.mockResolvedValue(true);

    render(<BuchenPage />);

    expect(await screen.findByText(/Jetzt buchen/i)).toBeInTheDocument();
    expect(
      screen.queryByText(/Online-Buchung noch nicht verfügbar/i),
    ).not.toBeInTheDocument();
  });
});

describe("Praevention /buchen-fuer-andere — Billing-Gate (C1:5)", () => {
  it("zeigt ehrlichen Hinweis statt Formular, wenn Buchung deaktiviert ist", async () => {
    mockIsEnabled.mockResolvedValue(false);

    render(<BuchenFuerAnderePage />);

    expect(
      await screen.findByText(/Online-Buchung noch nicht verfügbar/i),
    ).toBeInTheDocument();
    expect(screen.queryByText(/verschenken/i)).not.toBeInTheDocument();
  });
});
