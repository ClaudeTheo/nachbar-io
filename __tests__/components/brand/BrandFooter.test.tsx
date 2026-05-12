// Visual-Polish v7 Bundle 1 / Welle 3 — Warm-Dark Footer mit Logo-Signature.
// Magazin-Abschluss: dritte Surface (cream-canvas -> lifted-cream -> dark-footer).

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { BrandFooter } from "@/components/brand/BrandFooter";

describe("BrandFooter", () => {
  afterEach(() => cleanup());

  it("rendert die Magazin-Signatur fuer Bad Saeckingen", () => {
    render(<BrandFooter />);
    expect(
      screen.getByRole("heading", { name: /ein digitales quartier f.r bad s.ckingen/i }),
    ).toBeInTheDocument();
  });

  it("zeigt das Aquarell-Symbol (Founder 2026-05-12: kein Wordmark)", () => {
    const { container } = render(<BrandFooter />);
    const logo = container.querySelector('img[src*="quartierapp-symbol"]');
    expect(logo).not.toBeNull();
  });

  it("nutzt warm-dunklen Hintergrund + helle Schrift (3. Surface)", () => {
    const { container } = render(<BrandFooter />);
    const footer = container.querySelector("footer");
    expect(footer).not.toBeNull();
    const cls = footer?.className ?? "";
    // Warm-Dark Token bzw. arbitrary #2a2a38 (Visual-Polish v7 Iteration 2).
    expect(cls).toMatch(/bg-footer-dark|bg-\[#2a2a38\]/);
    // Helle Schrift gegen dunklen BG.
    expect(cls).toMatch(/text-warmwhite|text-cream/);
  });

  it("rendert eine Eyebrow-Zeile im Cream-Akzent (· EIN DIGITALES QUARTIER)", () => {
    const { container } = render(<BrandFooter />);
    const eyebrow = container.querySelector('[data-testid="brand-footer-eyebrow"]');
    expect(eyebrow).not.toBeNull();
    expect(eyebrow?.textContent).toMatch(/ein digitales quartier/i);
    expect(eyebrow?.className).toMatch(/uppercase/);
    expect(eyebrow?.className).toMatch(/tracking-/);
  });

  it("zeigt eine Meta-Zeile mit Datenschutz/Impressum/AGB", () => {
    render(<BrandFooter />);
    expect(
      screen.getByRole("link", { name: /datenschutz/i }),
    ).toHaveAttribute("href", "/datenschutz");
    expect(
      screen.getByRole("link", { name: /impressum/i }),
    ).toHaveAttribute("href", "/impressum");
    expect(
      screen.getByRole("link", { name: /agb/i }),
    ).toHaveAttribute("href", "/agb");
  });
});
