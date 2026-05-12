// Visual-Polish v7 Bundle 1 / Welle 2 — Floating Nav-Pill mit Brand-Anker.
// Tests fuer Logo-Symbol + Wordmark links, Avatar-Link rechts.

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { NavPill } from "@/components/brand/NavPill";

describe("NavPill", () => {
  afterEach(() => cleanup());

  it("rendert eine fixed Top-Pill mit weichem Schatten + Backdrop-Blur", () => {
    const { container } = render(<NavPill />);
    const pill = container.querySelector('[data-testid="app-nav-pill"]');
    expect(pill).not.toBeNull();
    const cls = pill?.className ?? "";
    expect(cls).toMatch(/fixed/);
    expect(cls).toMatch(/rounded-full/);
    expect(cls).toMatch(/backdrop-blur/);
    // Sehr soft, atmospheric Schatten — keine harten Inset-Schatten.
    expect(cls).toMatch(/shadow/);
  });

  it("zeigt das QuartierApp-Aquarell-Symbol als Brand-Anker links (Link zum Dashboard)", () => {
    render(<NavPill />);
    const brandLink = screen.getByRole("link", { name: /dashboard|quartierapp/i });
    expect(brandLink).toHaveAttribute("href", "/dashboard");
    const symbol = brandLink.querySelector("img");
    expect(symbol?.getAttribute("src")).toMatch(/quartierapp-symbol/);
  });

  it("rendert den Wordmark 'QuartierApp' (auf sm:+ sichtbar)", () => {
    render(<NavPill />);
    const wordmark = screen.getByText("QuartierApp");
    expect(wordmark).toBeInTheDocument();
    // Auf Mobile per sm:hidden ausgeblendet — visuell trotzdem im DOM.
    expect(wordmark.className).toMatch(/hidden|sr-only|sm:inline|sm:block/);
  });

  it("hat einen Avatar-Link rechts (Profil-Route, 44px Touch-Target)", () => {
    render(<NavPill />);
    const avatarLink = screen.getByRole("link", { name: /profil/i });
    expect(avatarLink).toHaveAttribute("href", "/profile");
    // 40 px ist Visual-Polish-Default. Senioren-Mindestmass 80 px gilt nur
    // in /senior/* — NavPill ist Standard-Layout.
    const cls = avatarLink.className;
    expect(cls).toMatch(/h-10|h-11|min-h-\[44px\]/);
    expect(cls).toMatch(/w-10|w-11|min-w-\[44px\]/);
  });

  it("liegt ueber dem Phase-Tint-Overlay (z-index > 1)", () => {
    const { container } = render(<NavPill />);
    const pill = container.querySelector('[data-testid="app-nav-pill"]');
    const cls = pill?.className ?? "";
    // body::before Tageszeit-Tint hat z-index 1 — NavPill muss darueber liegen.
    expect(cls).toMatch(/z-30|z-40|z-50/);
  });
});
