// Tests fuer den neuen "Mein Quartier"-Hub (Welle 3).
// Option C: /quartier ist wieder der kanonische Bottom-Tab, aber als
// schlanker statischer Hub. /quartier-info wird nur EINE Kachel.
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { QuartierHub } from "@/app/(app)/quartier/QuartierHub";

afterEach(cleanup);

describe("QuartierHub", () => {
  it("zeigt den Titel 'Mein Quartier'", () => {
    render(<QuartierHub />);
    expect(
      screen.getByRole("heading", { name: /Mein Quartier/i }),
    ).toBeInTheDocument();
  });

  it("verlinkt alle Quartier-Bereiche in der richtigen Reihenfolge", () => {
    render(<QuartierHub />);

    // Reihenfolge laut Codex-Empfehlung: Warnungen/Info zuerst.
    const expected: Array<[RegExp, string]> = [
      [/Wetter & Warnungen/i, "/quartier-info"],
      [/Rathaus & Services/i, "/city-services"],
      [/Veranstaltungen/i, "/events"],
      [/Karte/i, "/map"],
      [/Gruppen/i, "/gruppen"],
      [/Schwarzes Brett/i, "/board"],
      [/Nachrichten/i, "/news"],
      [/Müllkalender/i, "/waste-calendar"],
      [/Handwerker/i, "/handwerker"],
      [/Experten/i, "/experts"],
      [/Gefunden & Verloren/i, "/lost-found"],
      [/Abstimmungen/i, "/polls"],
    ];

    for (const [name, href] of expected) {
      expect(screen.getByRole("link", { name })).toHaveAttribute("href", href);
    }
  });

  it("hat genau 12 Bereichs-Kacheln", () => {
    render(<QuartierHub />);
    const tiles = screen
      .getAllByRole("link")
      .filter((el) => el.getAttribute("href") !== "/dashboard");
    expect(tiles).toHaveLength(12);
  });

  it("nimmt keine medizinischen oder abrechnungsnahen Bereiche in den Hub", () => {
    render(<QuartierHub />);
    expect(
      screen.queryByRole("link", { name: /Arzt|Pflege|Abo|Sprechstunde/i }),
    ).not.toBeInTheDocument();
  });
});
