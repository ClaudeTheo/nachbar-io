// modules/spiele/components/__tests__/PaareFinden.test.tsx
// Welle SP2-1: geteiltes „Paare finden". Karten-Flip + Paar-Logik (aus dem Kiosk
// extrahiert). Senior-Modus (Default): keine Zug-Anzeige, Abschluss OHNE
// Leistungs-Feedback, Karten >=80px. Kiosk-Modus (showMoves): Zug-Zaehler wie
// bisher. Foto-Karten zeigen Signed-URLs (SB-3).

import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { PaareFinden } from "@/modules/spiele/components/PaareFinden";
import type { PaarItem } from "@/modules/spiele/services/paare-board";

const EMOJI: PaarItem[] = [
  { id: "a", emoji: "🌻" },
  { id: "b", emoji: "🏠" },
  { id: "c", emoji: "☀️" },
];
const FOTOS: PaarItem[] = [
  { id: "p1", imageUrl: "https://signed.example/1.jpg", alt: "Oma im Garten" },
  { id: "p2", imageUrl: "https://signed.example/2.jpg", alt: "Geburtstag" },
];

/** Spiel deterministisch gewinnen: jede data-id hat genau 2 Karten -> beide klicken. */
function winGame() {
  const byId = new Map<string, HTMLElement[]>();
  for (const card of screen.getAllByTestId("paar-card")) {
    const id = card.getAttribute("data-id")!;
    (byId.get(id) ?? byId.set(id, []).get(id)!).push(card);
  }
  for (const pair of byId.values()) {
    fireEvent.click(pair[0]);
    fireEvent.click(pair[1]);
  }
}

describe("PaareFinden (SP2-1)", () => {
  afterEach(cleanup);

  it("rendert pro Paar zwei verdeckte Karten", () => {
    render(<PaareFinden paare={EMOJI} columns={4} />);
    const cards = screen.getAllByTestId("paar-card");
    expect(cards).toHaveLength(6);
    expect(cards.every((c) => c.getAttribute("data-state") === "hidden")).toBe(
      true,
    );
  });

  it("deckt eine Karte erst nach dem Klick auf", () => {
    render(<PaareFinden paare={EMOJI} columns={4} />);
    const card = screen.getAllByTestId("paar-card")[0];
    expect(card.textContent).toBe("");
    fireEvent.click(card);
    expect(card.getAttribute("data-state")).not.toBe("hidden");
    expect(card.textContent).not.toBe("");
  });

  it("Foto-Karten zeigen nach Aufdecken ein Bild mit Signed-URL", () => {
    render(<PaareFinden paare={FOTOS} columns={3} />);
    const card = screen.getAllByTestId("paar-card")[0];
    fireEvent.click(card);
    const img = card.querySelector("img");
    expect(img).not.toBeNull();
    expect(img!.getAttribute("src")).toContain("https://signed.example/");
  });

  it("zwei gleiche Karten bleiben als Paar gefunden", () => {
    render(<PaareFinden paare={EMOJI} columns={4} />);
    const byId = new Map<string, HTMLElement[]>();
    for (const card of screen.getAllByTestId("paar-card")) {
      const id = card.getAttribute("data-id")!;
      (byId.get(id) ?? byId.set(id, []).get(id)!).push(card);
    }
    const [first, second] = [...byId.values()][0];
    fireEvent.click(first);
    fireEvent.click(second);
    expect(first.getAttribute("data-state")).toBe("matched");
    expect(second.getAttribute("data-state")).toBe("matched");
  });

  it("Senior-Modus (Default): keine Zug-Anzeige, Abschluss ohne Leistungs-Feedback", () => {
    render(<PaareFinden paare={EMOJI} columns={4} />);
    expect(screen.queryByText(/Zug|Züge/)).toBeNull();
    winGame();
    expect(screen.getByText(/Schön gespielt/i)).toBeDefined();
    expect(screen.queryByText(/Züge/)).toBeNull();
  });

  it("Kiosk-Modus (showMoves): zeigt den Zug-Zaehler", () => {
    render(<PaareFinden paare={EMOJI} columns={4} showMoves />);
    expect(screen.getByText(/Zug|Züge/)).toBeDefined();
  });

  it("Senior-Karten sind >=80px Touch-Targets", () => {
    render(<PaareFinden paare={EMOJI} columns={4} />);
    for (const card of screen.getAllByTestId("paar-card")) {
      expect(card.getAttribute("style") ?? "").toContain("80px");
    }
  });
});
