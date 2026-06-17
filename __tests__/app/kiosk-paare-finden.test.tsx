// __tests__/app/kiosk-paare-finden.test.tsx — Welle SP2-1
// Sichert das Kiosk-Refactor auf die geteilte PaareFinden-Komponente: 16 Karten
// (8 Emoji-Paare), Zug-Zaehler (Kiosk-Modus) und der Zurueck-Link bleiben.

import { afterEach, describe, it, expect } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import PairsGamePage from "@/app/(kiosk)/kiosk/games/paare-finden/page";

afterEach(cleanup);

describe("Kiosk Paare finden (SP2-1 refactor)", () => {
  it("rendert 16 Karten, den Zug-Zaehler und den Zurueck-Link", () => {
    render(<PairsGamePage />);
    expect(screen.getAllByTestId("paar-card")).toHaveLength(16);
    expect(screen.getByText(/Zug|Züge/)).toBeDefined();
    expect(screen.getByRole("link", { name: /Zurück/i })).toBeDefined();
  });
});
