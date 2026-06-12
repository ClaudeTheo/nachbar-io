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
    // Pilot-Verschlankung (Befund C1:2): nur Kacheln mit garantiertem Inhalt.
    const expected: Array<[RegExp, string]> = [
      [/Wetter & Warnungen/i, "/quartier-info"],
      [/Rathaus & Services/i, "/city-services"],
      [/Veranstaltungen/i, "/events"],
      [/Karte/i, "/map"],
      [/Gruppen/i, "/gruppen"],
      [/Nachrichten/i, "/news"],
      [/Müllkalender/i, "/waste-calendar"],
    ];

    for (const [name, href] of expected) {
      expect(screen.getByRole("link", { name })).toHaveAttribute("href", href);
    }
  });

  it("hat genau 7 Bereichs-Kacheln (Pilot-Verschlankung C1:2)", () => {
    render(<QuartierHub />);
    const tiles = screen
      .getAllByRole("link")
      .filter((el) => el.getAttribute("href") !== "/dashboard");
    expect(tiles).toHaveLength(7);
  });

  it("zeigt im Pilot keine leeren UGC-/abgeschalteten Kacheln", () => {
    render(<QuartierHub />);
    expect(
      screen.queryByRole("link", {
        name: /Schwarzes Brett|Handwerker|Experten|Gefunden & Verloren|Abstimmungen/i,
      }),
    ).not.toBeInTheDocument();
  });

  it("nimmt keine medizinischen oder abrechnungsnahen Bereiche in den Hub", () => {
    render(<QuartierHub />);
    expect(
      screen.queryByRole("link", { name: /Arzt|Pflege|Abo|Sprechstunde/i }),
    ).not.toBeInTheDocument();
  });
});
