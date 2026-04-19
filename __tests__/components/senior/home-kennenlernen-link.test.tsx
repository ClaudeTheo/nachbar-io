// __tests__/components/senior/home-kennenlernen-link.test.tsx
// Welle C C6c — Verifiziert dass die Senior-Home-Page einen 1-Tap-Link
// zum KI-Onboarding-Wizard (/kennenlernen) anbietet. Damit ist der Wizard
// auffindbar (vorher nur per Direct-URL erreichbar).

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

import SeniorDeviceHomePage from "@/app/(senior)/page";

// SeniorSosButton zieht eine Reihe von Care-Routes nach — fuer den Link-
// Test reicht ein leichter Mock.
vi.mock("@/modules/care/components/senior/SeniorSosButton", () => ({
  SeniorSosButton: () => <div data-testid="sos-button-mock" />,
}));

beforeEach(() => {
  vi.clearAllMocks();
  // Senior-Home pollt die Care-API bei Mount — mit leeren OK-Responses
  // beantworten, damit sich der Render nicht aufhaengt.
  vi.spyOn(globalThis, "fetch").mockImplementation(
    async () => new Response("[]", { status: 200 }) as unknown as Response,
  );
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("Senior-Home — Kennenlernen-Link (C6c)", () => {
  it("zeigt Link 'KI kennenlernen' der zu /kennenlernen fuehrt", () => {
    render(<SeniorDeviceHomePage />);
    const link = screen.getByRole("link", {
      name: /kennenlernen|ki.*kennen|assistent.*kennen/i,
    });
    expect(link).toHaveAttribute("href", "/kennenlernen");
  });

  it("Senior-Mode: Kennenlernen-Link hat min-height 80px", () => {
    render(<SeniorDeviceHomePage />);
    const link = screen.getByRole("link", {
      name: /kennenlernen|ki.*kennen|assistent.*kennen/i,
    });
    expect(link.style.minHeight).toBe("80px");
  });
});
