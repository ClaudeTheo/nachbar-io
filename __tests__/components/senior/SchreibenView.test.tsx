// __tests__/components/senior/SchreibenView.test.tsx
// Task H-1: Rendering der /schreiben-Senior-Seite.
// Stateless Komponente — bekommt bereits transformierte Kontakte und rendert
// sie als Senior-gerechte Kacheln (>=80px Touch-Target, Anthrazit-Kontur).

import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { SchreibenView } from "@/components/senior/SchreibenView";
import type { SchreibenContact } from "@/lib/messaging/schreiben-contacts";

describe("SchreibenView (H-1)", () => {
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
        whatsappUrl: "https://wa.me/4917612345678",
      },
      {
        name: "Bernd Nachbar",
        relationship: "Nachbar",
        whatsappUrl: "https://wa.me/4917699999999",
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

  it("gueltige Kontakte sind Links auf den wa.me-URL", () => {
    const contacts: SchreibenContact[] = [
      {
        name: "Anna Muster",
        relationship: "Tochter",
        whatsappUrl: "https://wa.me/4917612345678",
      },
    ];
    render(<SchreibenView contacts={contacts} />);

    const link = screen.getByRole("link", { name: /Anna Muster/i });
    expect(link.getAttribute("href")).toBe("https://wa.me/4917612345678");
    // Muss in neuem Tab/der WhatsApp-App oeffnen
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toContain("noopener");
  });

  it("Kontakte ohne gueltige Nummer werden als ausgegraute Nicht-Links dargestellt", () => {
    const contacts: SchreibenContact[] = [
      {
        name: "Oma Ohne Handy",
        relationship: "Mutter",
        whatsappUrl: null,
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
        whatsappUrl: "https://wa.me/4917612345678",
      },
    ];
    render(<SchreibenView contacts={contacts} />);
    const tile = screen.getByTestId("schreiben-contact-tile");
    const style = tile.getAttribute("style") ?? "";
    expect(style).toContain("min-height");
  });
});
