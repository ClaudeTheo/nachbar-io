// __tests__/components/senior/home-checkin-label.test.tsx
// Welle 2 (B1:6) — Der Check-in-Button auf der Senior-Home navigiert nur auf
// /checkin (das dann "Wie geht es Ihnen?" fragt). Das alte Label "Mir geht es
// gut" nahm die Antwort vorweg, obwohl nur navigiert wird. Das Label spiegelt
// jetzt die Zielseite ("Wie geht es mir?") und setzt die richtige Erwartung.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

import SeniorDeviceHomePage from "@/app/(senior)/page";

// SeniorSosButton zieht eine Reihe von Care-Routes nach — leichter Mock genuegt.
vi.mock("@/modules/care/components/senior/SeniorSosButton", () => ({
  SeniorSosButton: () => <div data-testid="sos-button-mock" />,
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(globalThis, "fetch").mockImplementation(
    async () => new Response("[]", { status: 200 }) as unknown as Response,
  );
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("Senior-Home — Check-in-Label (B1:6)", () => {
  it("zeigt den Check-in-Link als 'Wie geht es mir?' und fuehrt auf /checkin", () => {
    render(<SeniorDeviceHomePage />);
    const link = screen.getByRole("link", { name: /wie geht es mir/i });
    expect(link).toHaveAttribute("href", "/checkin");
  });

  it("nimmt die Antwort nicht mehr vorweg ('Mir geht es gut' nicht als Home-Link)", () => {
    render(<SeniorDeviceHomePage />);
    expect(
      screen.queryByRole("link", { name: /^mir geht es gut$/i }),
    ).toBeNull();
  });

  it("Senior-Mode: Check-in-Link hat min-height 80px", () => {
    render(<SeniorDeviceHomePage />);
    const link = screen.getByRole("link", { name: /wie geht es mir/i });
    expect(link.style.minHeight).toBe("80px");
  });
});
