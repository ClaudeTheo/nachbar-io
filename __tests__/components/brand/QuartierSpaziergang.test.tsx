// Visual-Polish v7 Iteration 2 — Welle 6 Quartier-Spaziergang Parallax.
// Tests fuer die 4-Layer-Parallax-Komponente die HINTER dem App-Shell-
// Aquarell-Hintergrund liegt und beim Scrollen mit unterschiedlichen
// Geschwindigkeiten mitwandert.

import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { QuartierSpaziergang } from "@/components/brand/QuartierSpaziergang";

describe("QuartierSpaziergang", () => {
  afterEach(() => cleanup());

  it("rendert einen decorativen Container (aria-hidden, pointer-events-none)", () => {
    const { container } = render(<QuartierSpaziergang />);
    const wrapper = container.querySelector(
      '[data-testid="quartier-spaziergang"]',
    );
    expect(wrapper).not.toBeNull();
    expect(wrapper?.getAttribute("aria-hidden")).toBe("true");
    expect(wrapper?.className).toMatch(/pointer-events-none/);
  });

  it("liegt fixed full-screen, overflow-hidden, im hintersten z-Index (-z-20)", () => {
    const { container } = render(<QuartierSpaziergang />);
    const wrapper = container.querySelector(
      '[data-testid="quartier-spaziergang"]',
    );
    const cls = wrapper?.className ?? "";
    expect(cls).toMatch(/fixed/);
    expect(cls).toMatch(/inset-0/);
    expect(cls).toMatch(/overflow-hidden/);
    // AppAquarellBackground sitzt auf -z-10. Diese Schicht muss DAHINTER
    // (also tiefer in der Stacking-Order) liegen: -z-20.
    expect(cls).toMatch(/-z-20/);
  });

  it("rendert Layer L1 Schwarzwald (Tannen-Aquarell)", () => {
    const { container } = render(<QuartierSpaziergang />);
    const l1 = container.querySelector('[data-layer="l1"]');
    expect(l1).not.toBeNull();
    const img = l1?.querySelector("img");
    expect(img?.getAttribute("src")).toMatch(/l1-schwarzwald/);
  });

  it("rendert Layer L2 Hochrhein (Wellenlinien)", () => {
    const { container } = render(<QuartierSpaziergang />);
    const l2 = container.querySelector('[data-layer="l2"]');
    expect(l2).not.toBeNull();
    const img = l2?.querySelector("img");
    expect(img?.getAttribute("src")).toMatch(/l2-hochrhein/);
  });

  it("rendert Layer L3 Skyline (Fridolinsmuenster + Holzbruecke)", () => {
    const { container } = render(<QuartierSpaziergang />);
    const l3 = container.querySelector('[data-layer="l3"]');
    expect(l3).not.toBeNull();
    const img = l3?.querySelector("img");
    expect(img?.getAttribute("src")).toMatch(/l3-skyline/);
  });

  it("rendert L4 mit 4 separaten Vignetten (Sparrow, Bench, Windowbox, Signpost)", () => {
    const { container } = render(<QuartierSpaziergang />);
    const sparrow = container.querySelector('[data-layer="l4-sparrow"]');
    const bench = container.querySelector('[data-layer="l4-bench"]');
    const windowbox = container.querySelector('[data-layer="l4-windowbox"]');
    const signpost = container.querySelector('[data-layer="l4-signpost"]');
    expect(sparrow).not.toBeNull();
    expect(bench).not.toBeNull();
    expect(windowbox).not.toBeNull();
    expect(signpost).not.toBeNull();
    expect(sparrow?.querySelector("img")?.getAttribute("src")).toMatch(
      /l4-sparrow/,
    );
    expect(bench?.querySelector("img")?.getAttribute("src")).toMatch(
      /l4-bench/,
    );
    expect(windowbox?.querySelector("img")?.getAttribute("src")).toMatch(
      /l4-windowbox/,
    );
    expect(signpost?.querySelector("img")?.getAttribute("src")).toMatch(
      /l4-signpost/,
    );
  });

  it("alle Layer sind dekorativ (img mit leerem alt)", () => {
    const { container } = render(<QuartierSpaziergang />);
    const imgs = container.querySelectorAll(
      '[data-testid="quartier-spaziergang"] img',
    );
    expect(imgs.length).toBeGreaterThanOrEqual(7);
    imgs.forEach((img) => {
      // alt="" markiert dekorative Bilder fuer Screenreader
      expect(img.getAttribute("alt")).toBe("");
    });
  });

  it("DOM-Reihenfolge: L1 -> L2 -> L3 -> L4 (Layer-Stack)", () => {
    const { container } = render(<QuartierSpaziergang />);
    const layers = Array.from(
      container.querySelectorAll(
        '[data-testid="quartier-spaziergang"] [data-layer]',
      ),
    ).map((el) => el.getAttribute("data-layer"));
    // L1 zuerst (hinten), L4 zuletzt (vorne) — Painters Algorithm
    expect(layers.indexOf("l1")).toBeLessThan(layers.indexOf("l2"));
    expect(layers.indexOf("l2")).toBeLessThan(layers.indexOf("l3"));
    expect(layers.indexOf("l3")).toBeLessThan(
      layers.indexOf("l4-sparrow"),
    );
  });

  it("L1 ist sehr dezent (opacity-12)", () => {
    const { container } = render(<QuartierSpaziergang />);
    const l1 = container.querySelector('[data-layer="l1"]');
    // Founder-Lehre Bundle 2: dezent, kein knalliges Aquarell-Wash.
    // L1 12% opacity per Brief.
    expect(l1?.className).toMatch(/opacity-\[0\.12\]/);
  });

  it("L2 ist dezent (opacity-18)", () => {
    const { container } = render(<QuartierSpaziergang />);
    const l2 = container.querySelector('[data-layer="l2"]');
    expect(l2?.className).toMatch(/opacity-\[0\.18\]/);
  });

  it("L3 ist dezent (opacity-25)", () => {
    const { container } = render(<QuartierSpaziergang />);
    const l3 = container.querySelector('[data-layer="l3"]');
    expect(l3?.className).toMatch(/opacity-\[0\.25\]/);
  });

  it("L4 Vignetten haben mid-range opacity (40-60%)", () => {
    const { container } = render(<QuartierSpaziergang />);
    const sparrow = container.querySelector('[data-layer="l4-sparrow"]');
    const bench = container.querySelector('[data-layer="l4-bench"]');
    // L4 Foreground darf etwas praesenter sein als L1-L3 (40-60% Brief).
    // Akzeptiere alles im Bereich 0.4-0.6.
    expect(sparrow?.className).toMatch(/opacity-\[0\.(4[0-9]|5[0-9]|60)\]/);
    expect(bench?.className).toMatch(/opacity-\[0\.(4[0-9]|5[0-9]|60)\]/);
  });

  it("L4 + Sparrow-Animation sind auf Mobile disabled (CSS-Klasse)", () => {
    // Mobile-Disable laut Brief: L4 + Vogel-Flug sind auf <=640px aus.
    // Im Unit-Test koennen wir den CSS-Media-Query nicht ausloesen, aber
    // wir verifizieren dass das L4-Wrapper eine Mobile-Hide-Klasse hat
    // (z.B. "hidden sm:block" oder eine CSS-only Anchor-Klasse).
    const { container } = render(<QuartierSpaziergang />);
    const l4Group = container.querySelector('[data-l4-group="true"]');
    expect(l4Group).not.toBeNull();
    const cls = l4Group?.className ?? "";
    // Hidden auf Mobile (<=640px), block ab sm-Breakpoint
    expect(cls).toMatch(/hidden/);
    expect(cls).toMatch(/sm:block/);
  });

  it("Container traegt Motion-Marker-Klasse fuer CSS-Animations-Hooks", () => {
    // Welle 7 Motion: Wind-Drift, Vogel-Flug, Watercolor-Breathe etc.
    // werden ueber CSS-Animations in globals.css gesteuert. Die Component
    // exponiert dafuer eine stabile Top-Level-Klasse, an die globals.css
    // andocken kann.
    const { container } = render(<QuartierSpaziergang />);
    const wrapper = container.querySelector(
      '[data-testid="quartier-spaziergang"]',
    );
    expect(wrapper?.className).toMatch(/quartier-spaziergang/);
  });
});
