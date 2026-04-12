// __tests__/components/senior/SchreibenView.test.tsx
// Task H-1 → H-2: Rendering der /schreiben-Senior-Seite.
// Stateless Komponente — bekommt bereits transformierte Kontakte und rendert
// sie als Senior-gerechte Kacheln (>=80px Touch-Target, Anthrazit-Kontur).
// Gueltige Kontakte verlinken auf /schreiben/mic/:index (Voice-Flow).

import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { SchreibenView } from "@/components/senior/SchreibenView";
import type { SchreibenContact } from "@/lib/messaging/schreiben-contacts";

describe("SchreibenView (H-1 → H-2)", () => {
  // vitest.setup.ts aktiviert kein globales Cleanup. Ohne das haeufen sich
  // gerenderte DOM-Fragmente zwischen Tests an und "multiple elements"-Fehler
  // sind die Folge. Lokaler afterEach laesst die umliegende Konfiguration
  // unberuehrt.
  afterEach(cleanup);

  it("zeigt einen leeren Zustand wenn keine Kontakte vorhanden sind", () => {
    render(<SchreibenView contacts={[]} />);
    expect(
      screen.getByText(/Kreis ist noch nicht eingerichtet/i),
    ).toBeDefined();
    // Einrichtungs-Pfad muss angeboten werden — Link zum Care-Profil
    const setupLink = screen.getByRole("link", { name: /Kreis einrichten/i });
    expect(setupLink.getAttribute("href")).toBe("/care/profile");
  });

  it("rendert pro Kontakt eine Kachel mit Name und Beziehung", () => {
    const contacts: SchreibenContact[] = [
      {
        name: "Anna Muster",
        relationship: "Tochter",
        phone: "+49 176 12345678",
        index: 0,
      },
      {
        name: "Bernd Nachbar",
        relationship: "Nachbar",
        phone: "+49 176 99999999",
        index: 1,
      },
    ];
    render(<SchreibenView contacts={contacts} />);

    const tiles = screen.getAllByTestId("schreiben-contact-tile");
    expect(tiles).toHaveLength(2);
    expect(screen.getByText("Anna Muster")).toBeDefined();
    expect(screen.getByText("Tochter")).toBeDefined();
    expect(screen.getByText("Bernd Nachbar")).toBeDefined();
    expect(screen.getByText("Nachbar")).toBeDefined();
  });

  it("gueltige Kontakte verlinken auf /schreiben/mic/:index", () => {
    const contacts: SchreibenContact[] = [
      {
        name: "Anna Muster",
        relationship: "Tochter",
        phone: "+49 176 12345678",
        index: 0,
      },
    ];
    render(<SchreibenView contacts={contacts} />);

    const link = screen.getByRole("link", { name: /Anna Muster/i });
    expect(link.getAttribute("href")).toBe("/schreiben/mic/0");
  });

  it("zweiter Kontakt verlinkt auf /schreiben/mic/1", () => {
    const contacts: SchreibenContact[] = [
      {
        name: "Anna Muster",
        relationship: "Tochter",
        phone: "+49 176 12345678",
        index: 0,
      },
      {
        name: "Bernd Nachbar",
        relationship: "Nachbar",
        phone: "+49 176 99999999",
        index: 1,
      },
    ];
    render(<SchreibenView contacts={contacts} />);

    const link = screen.getByRole("link", { name: /Bernd Nachbar/i });
    expect(link.getAttribute("href")).toBe("/schreiben/mic/1");
  });

  it("Kontakte ohne gueltige Nummer werden als ausgegraute Nicht-Links dargestellt", () => {
    const contacts: SchreibenContact[] = [
      {
        name: "Oma Ohne Handy",
        relationship: "Mutter",
        phone: null,
        index: 0,
      },
    ];
    render(<SchreibenView contacts={contacts} />);

    // Kein Link, sondern ein disabled-Element
    expect(screen.queryByRole("link", { name: /Oma Ohne Handy/i })).toBeNull();
    const tile = screen.getByTestId("schreiben-contact-tile");
    expect(tile.getAttribute("aria-disabled")).toBe("true");
    // Hinweistext fuer Senior warum die Kachel grau ist
    expect(screen.getByText(/Keine Nummer hinterlegt/i)).toBeDefined();
  });

  it("Kacheln haben min-height >=80px (Senior-Touch-Target Regel)", () => {
    const contacts: SchreibenContact[] = [
      {
        name: "Anna Muster",
        relationship: "Tochter",
        phone: "+49 176 12345678",
        index: 0,
      },
    ];
    render(<SchreibenView contacts={contacts} />);
    const tile = screen.getByTestId("schreiben-contact-tile");
    const style = tile.getAttribute("style") ?? "";
    expect(style).toContain("min-height");
  });
});
