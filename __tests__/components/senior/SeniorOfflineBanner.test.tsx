// W7 (Befund A3:6): Offline-Banner fuer die Senior-Oberflaeche.
// Die Zielgruppe 75+ kann einen Netzausfall nicht von "mir wird nicht
// geholfen" unterscheiden — der Banner sagt ruhig, was los ist, und dass
// der Telefon-Notruf 112 unabhaengig vom Internet weiter funktioniert.

import { describe, it, expect, afterEach } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import { SeniorOfflineBanner } from "@/components/senior/SeniorOfflineBanner";

function setNavigatorOnline(value: boolean) {
  Object.defineProperty(window.navigator, "onLine", {
    configurable: true,
    get: () => value,
  });
}

afterEach(() => {
  cleanup();
  setNavigatorOnline(true);
});

describe("SeniorOfflineBanner (A3:6)", () => {
  it("rendert nichts, solange die Verbindung steht", () => {
    setNavigatorOnline(true);
    const { container } = render(<SeniorOfflineBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it("zeigt den Hinweis, wenn das Geraet schon offline startet", () => {
    setNavigatorOnline(false);
    render(<SeniorOfflineBanner />);

    expect(screen.getByRole("status")).toHaveTextContent(
      "Keine Internet-Verbindung",
    );
    // Der wichtigste Satz: der Telefon-Notruf haengt NICHT am Internet.
    expect(screen.getByRole("status")).toHaveTextContent(
      "Der Notruf 112 über Ihr Telefon funktioniert weiterhin",
    );
  });

  it("erscheint beim offline-Event und verschwindet beim online-Event", () => {
    setNavigatorOnline(true);
    const { container } = render(<SeniorOfflineBanner />);
    expect(container).toBeEmptyDOMElement();

    act(() => {
      setNavigatorOnline(false);
      window.dispatchEvent(new Event("offline"));
    });
    expect(screen.getByRole("status")).toHaveTextContent(
      "Keine Internet-Verbindung",
    );

    act(() => {
      setNavigatorOnline(true);
      window.dispatchEvent(new Event("online"));
    });
    expect(container).toBeEmptyDOMElement();
  });
});
