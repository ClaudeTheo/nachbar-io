import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import LandingPage from "@/app/page";

describe("Closed-Pilot-Startseite", () => {
  afterEach(() => cleanup());

  it("zeigt nur den geschlossenen Pilot statt oeffentlicher Produktwerbung", () => {
    const { container } = render(<LandingPage />);

    expect(
      screen.getByRole("heading", { name: /geschlossener pilot/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/nicht öffentlich freigeschaltet/i),
    ).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /registrieren/i })).toBeNull();
    expect(screen.getByRole("link", { name: /anmelden/i })).toHaveAttribute(
      "href",
      "/login",
    );
    expect(
      container.querySelector('script[type="application/ld+json"]'),
    ).toBeNull();
  });

  it("rendert das QuartierApp-Aquarell-Logo im Hero (Tanne + Haeuser + Sonne)", () => {
    render(<LandingPage />);

    const logo = screen.getByRole("img", {
      name: /QuartierApp.*digitales Quartier/i,
    });
    expect(logo).toBeInTheDocument();
    // Full-Variant zeigt das volle Aquarell-Motiv inkl. Wordmark.
    expect(logo).toHaveAttribute("src", expect.stringContaining("quartierapp-logo"));
  });

  it("nutzt Brand-Tokens (bg-warmwhite + text-anthrazit) statt hartcodierter Hex", () => {
    const { container } = render(<LandingPage />);
    const main = container.querySelector("main");
    expect(main).not.toBeNull();
    const className = main?.className ?? "";
    // Warmwhite-BG via Brand-Token statt #f7f5ef.
    expect(className).toMatch(/bg-warmwhite/);
    // Anthrazit-Text via Brand-Token statt #23262f.
    expect(className).toMatch(/text-anthrazit/);
  });

  it("zeigt dezenten Aquarell-Symbol-Layer als Hintergrund (decorative)", () => {
    const { container } = render(<LandingPage />);
    // Dezenter Hintergrund-Layer: aria-hidden + Symbol-Asset + opacity < 1.
    const bgLayer = container.querySelector('[data-testid="landing-bg-aquarell"]');
    expect(bgLayer).not.toBeNull();
    expect(bgLayer?.getAttribute("aria-hidden")).toBe("true");
    const bgImg = bgLayer?.querySelector("img");
    expect(bgImg).not.toBeNull();
    expect(bgImg?.getAttribute("src")).toMatch(/quartierapp-symbol|quartierapp-master/);
  });
});
