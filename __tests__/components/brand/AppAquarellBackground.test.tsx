// Visual-Polish v7 Iteration 2 — Photo/Pattern-Schicht fuer App-Shell.
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

  it("nutzt sehr niedrige Opacity damit Lesbarkeit erhalten bleibt", () => {
    const { container } = render(<AppAquarellBackground />);
    const img = container.querySelector('[data-testid="app-bg-aquarell"] img');
    const cls = img?.className ?? "";
    // Opacity-Klasse muss unter 0.15 sein (sonst stoert es den Content).
    expect(cls).toMatch(/opacity-\[0\.0[0-9]+\]|opacity-(5|10)\b/);
  });

  it("erlaubt explizite Opacity-Anpassung via prop", () => {
    const { container } = render(<AppAquarellBackground opacity={0.05} />);
    const img = container.querySelector('[data-testid="app-bg-aquarell"] img');
    expect(img?.className).toMatch(/opacity-\[0\.05\]/);
  });
});
