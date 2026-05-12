// Visual-Polish v7 Iteration 2 — Aquarell-Symbol-Schicht fuer App-Shell.
// Tests fuer den dezenten Aquarell-Hintergrund auf allen eingeloggten Seiten.

import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { AppAquarellBackground } from "@/components/brand/AppAquarellBackground";

describe("AppAquarellBackground", () => {
  afterEach(() => cleanup());

  it("rendert einen decorativen Container (aria-hidden, pointer-events-none)", () => {
    const { container } = render(<AppAquarellBackground />);
    const wrapper = container.querySelector('[data-testid="app-bg-aquarell"]');
    expect(wrapper).not.toBeNull();
    expect(wrapper?.getAttribute("aria-hidden")).toBe("true");
    expect(wrapper?.className).toMatch(/pointer-events-none/);
  });

  it("lädt das Aquarell-Symbol (Tanne + Häuser + Sonne)", () => {
    const { container } = render(<AppAquarellBackground />);
    const img = container.querySelector('[data-testid="app-bg-aquarell"] img');
    expect(img).not.toBeNull();
    expect(img?.getAttribute("src")).toMatch(/quartierapp-symbol/);
  });

  it("liegt im hintersten z-Index (-z-10 / fixed full-screen)", () => {
    const { container } = render(<AppAquarellBackground />);
    const wrapper = container.querySelector('[data-testid="app-bg-aquarell"]');
    const className = wrapper?.className ?? "";
    expect(className).toMatch(/fixed/);
    expect(className).toMatch(/inset-0/);
    expect(className).toMatch(/-z-10/);
  });

  it("positioniert das Symbol oben (object-top) und nutzt object-contain", () => {
    const { container } = render(<AppAquarellBackground />);
    const img = container.querySelector('[data-testid="app-bg-aquarell"] img');
    const cls = img?.className ?? "";
    // Founder-Wunsch 2026-05-12: Hintergrund "ganz oben".
    expect(cls).toMatch(/object-top/);
    // Symbol braucht object-contain (Aquarell-Logo soll vollstaendig sichtbar
    // bleiben, nicht beschnitten wie ein Foto). object-cover wird absichtlich
    // NICHT genutzt — Foto-Hintergrund war ein Irrweg, ist nur fuer Landing.
    expect(cls).toMatch(/object-contain/);
  });

  it("nutzt dezente Opacity damit Lesbarkeit erhalten bleibt", () => {
    const { container } = render(<AppAquarellBackground />);
    const img = container.querySelector('[data-testid="app-bg-aquarell"] img');
    const cls = img?.className ?? "";
    // Default-Opacity ist 0.15 (Symbol vertraegt mehr als Foto, weil
    // grossflaechiger Cream-Anteil).
    expect(cls).toMatch(/opacity-\[0\.15\]/);
  });

  it("erlaubt explizite Opacity-Anpassung via prop", () => {
    const { container } = render(<AppAquarellBackground opacity={0.05} />);
    const img = container.querySelector('[data-testid="app-bg-aquarell"] img');
    expect(img?.className).toMatch(/opacity-\[0\.05\]/);
  });
});
