import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { QuartierSpaziergang } from "@/components/brand/QuartierSpaziergang";

describe("QuartierSpaziergang", () => {
  afterEach(() => cleanup());

  it("rendert einen rein dekorativen fixed Hintergrund hinter der App-Shell", () => {
    const { container } = render(<QuartierSpaziergang />);
    const wrapper = container.querySelector(
      '[data-testid="quartier-spaziergang"]',
    );

    expect(wrapper).not.toBeNull();
    expect(wrapper?.getAttribute("aria-hidden")).toBe("true");
    expect(wrapper?.className).toMatch(/pointer-events-none/);
    expect(wrapper?.className).toMatch(/fixed/);
    expect(wrapper?.className).toMatch(/inset-0/);
    expect(wrapper?.className).toMatch(/-z-20/);
  });

  it("rendert die drei grossen Quartier-Schichten in stabiler Reihenfolge", () => {
    const { container } = render(<QuartierSpaziergang />);

    const layers = Array.from(
      container.querySelectorAll(
        '[data-testid="quartier-spaziergang"] [data-layer]',
      ),
    ).map((node) => node.getAttribute("data-layer"));

    expect(layers.indexOf("l1")).toBeLessThan(layers.indexOf("l2"));
    expect(layers.indexOf("l2")).toBeLessThan(layers.indexOf("l3"));
    expect(
      container
        .querySelector('[data-layer="l1"] img')
        ?.getAttribute("src"),
    ).toMatch(/l1-schwarzwald/);
    expect(
      container
        .querySelector('[data-layer="l2"] img')
        ?.getAttribute("src"),
    ).toMatch(/l2-hochrhein/);
    expect(
      container
        .querySelector('[data-layer="l3"] img')
        ?.getAttribute("src"),
    ).toMatch(/l3-skyline/);
  });

  it("setzt alle grossen Schichten bewusst leise und mit Multiply-Blending", () => {
    const { container } = render(<QuartierSpaziergang />);

    expect(container.querySelector('[data-layer="l1"]')?.className).toMatch(
      /opacity-\[0\.10\].*mix-blend-multiply|mix-blend-multiply.*opacity-\[0\.10\]/,
    );
    expect(container.querySelector('[data-layer="l2"]')?.className).toMatch(
      /opacity-\[0\.08\].*mix-blend-multiply|mix-blend-multiply.*opacity-\[0\.08\]/,
    );
    expect(container.querySelector('[data-layer="l3"]')?.className).toMatch(
      /opacity-\[0\.11\].*mix-blend-multiply|mix-blend-multiply.*opacity-\[0\.11\]/,
    );
  });

  it("rendert vier kleine Vignetten, aber versteckt sie auf Mobile", () => {
    const { container } = render(<QuartierSpaziergang />);

    const l4Group = container.querySelector('[data-l4-group="true"]');
    expect(l4Group?.className).toMatch(/hidden/);
    expect(l4Group?.className).toMatch(/sm:block/);
    for (const layer of [
      "l4-sparrow",
      "l4-bench",
      "l4-windowbox",
      "l4-signpost",
    ]) {
      expect(container.querySelector(`[data-layer="${layer}"]`)).not.toBeNull();
      expect(
        container
          .querySelector(`[data-layer="${layer}"] img`)
          ?.getAttribute("src"),
      ).toMatch(new RegExp(layer));
    }
  });

  it("markiert alle Bilder als dekorativ", () => {
    const { container } = render(<QuartierSpaziergang />);
    const imgs = container.querySelectorAll(
      '[data-testid="quartier-spaziergang"] img',
    );

    expect(imgs.length).toBe(7);
    imgs.forEach((img) => expect(img.getAttribute("alt")).toBe(""));
  });

  it("exponiert stabile CSS-Hooks fuer Motion und Reduced-Motion-Regeln", () => {
    const { container } = render(<QuartierSpaziergang />);

    expect(
      container.querySelector('[data-testid="quartier-spaziergang"]')
        ?.className,
    ).toMatch(/quartier-spaziergang/);
    expect(container.querySelector('[data-layer="l1"]')?.className).toMatch(
      /qs-l1/,
    );
    expect(container.querySelector('[data-layer="l3"]')?.className).toMatch(
      /qs-l3/,
    );
    expect(
      container.querySelector('[data-layer="l4-sparrow"]')?.className,
    ).toMatch(/qs-bird-fly/);
  });
});
