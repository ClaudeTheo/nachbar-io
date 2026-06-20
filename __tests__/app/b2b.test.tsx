// __tests__/app/b2b.test.tsx
// Welle F4 (Befund B2:2 / C3:6): Die oeffentliche B2B-Seite hatte einen
// unaufgeloesten Template-Platzhalter ${plan.name} im mailto-Subject (normaler
// String statt Template-Literal) und eine unvollstaendige Firmierung.

import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import B2BPage from "@/app/b2b/page";

afterEach(cleanup);

describe("B2B-Landingpage (F4 / B2:2 + C3:6)", () => {
  it("kein Kontakt-Link enthaelt einen unaufgeloesten Template-Platzhalter", () => {
    render(<B2BPage />);
    const links = screen.getAllByRole("link", { name: /Kontakt aufnehmen/i });
    expect(links.length).toBeGreaterThan(0);
    for (const link of links) {
      const href = link.getAttribute("href") ?? "";
      expect(href.startsWith("mailto:")).toBe(true);
      expect(href).not.toContain("${");
    }
  });

  it("der Pricing-Kontaktlink kodiert den Plannamen sauber im Subject", () => {
    render(<B2BPage />);
    const links = screen.getAllByRole("link", { name: /Kontakt aufnehmen/i });
    const withPlan = links.find((l) =>
      (l.getAttribute("href") ?? "").includes("Pro%20Community"),
    );
    expect(withPlan).toBeDefined();
  });

  it("der Footer fuehrt die vollstaendige Firmierung Theobase GmbH", () => {
    render(<B2BPage />);
    expect(screen.getByText(/Theobase GmbH/i)).toBeInTheDocument();
  });
});
