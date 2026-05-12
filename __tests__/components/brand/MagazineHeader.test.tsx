// Visual-Polish v7 — Magazin-Hero fuer App-Pages.
// Wiederverwendbarer Header im Dashboard-Stil: Eyebrow (accent-dot + UPPERCASE)
// + H1 (36 px / 600 / -0.02em) + Subtitle + optionaler Back-Link.

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { MagazineHeader } from "@/components/brand/MagazineHeader";

describe("MagazineHeader", () => {
  afterEach(() => cleanup());

  it("rendert Eyebrow + H1 mit Brand-Tokens", () => {
    render(
      <MagazineHeader
        eyebrow="AERZTE · BAD SAECKINGEN"
        title="Aerzte in der Naehe"
      />,
    );
    const eyebrowText = screen.getByText("AERZTE · BAD SAECKINGEN");
    // Eyebrow-Container traegt das uppercase + tracking, nicht der Text-Span.
    const eyebrowContainer = eyebrowText.closest("p");
    expect(eyebrowContainer).not.toBeNull();
    expect(eyebrowContainer?.className).toMatch(/uppercase/);
    expect(eyebrowContainer?.className).toMatch(/tracking-\[0\.08em\]/);

    const h1 = screen.getByRole("heading", { level: 1, name: /aerzte in der naehe/i });
    expect(h1).toBeInTheDocument();
    expect(h1.className).toMatch(/text-\[36px\]/);
    expect(h1.className).toMatch(/text-anthrazit/);
  });

  it("rendert Subtitle wenn gesetzt", () => {
    render(
      <MagazineHeader
        eyebrow="AERZTE"
        title="Aerzte"
        subtitle="Im Umkreis von 20 km"
      />,
    );
    expect(screen.getByText("Im Umkreis von 20 km")).toBeInTheDocument();
  });

  it("zeigt accent-dot vor dem Eyebrow (decorative)", () => {
    const { container } = render(
      <MagazineHeader eyebrow="HEUTE" title="Quartier" />,
    );
    const dot = container.querySelector('[data-testid="magazine-eyebrow-dot"]');
    expect(dot).not.toBeNull();
    expect(dot?.getAttribute("aria-hidden")).toBe("true");
    expect(dot?.className).toMatch(/bg-quartier-green/);
  });

  it("rendert optionalen Back-Link mit korrektem href + Label", () => {
    render(
      <MagazineHeader
        eyebrow="AERZTE"
        title="Aerzte"
        backHref="/care"
        backLabel="Zurueck zur Pflege"
      />,
    );
    const link = screen.getByRole("link", { name: /zurueck zur pflege/i });
    expect(link).toHaveAttribute("href", "/care");
  });

  it("rendert keinen Back-Link wenn backHref fehlt", () => {
    render(<MagazineHeader eyebrow="HEUTE" title="Quartier" />);
    expect(screen.queryByRole("link")).toBeNull();
  });
});
