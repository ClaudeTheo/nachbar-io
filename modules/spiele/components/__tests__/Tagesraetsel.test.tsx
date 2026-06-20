// modules/spiele/components/__tests__/Tagesraetsel.test.tsx
// Welle SP1-3: failure-free Tagesrätsel. Im failure-free-Modus gibt es KEINE
// Rot-/Falsch-Markierung — jede Antwort öffnet die Geschichte; keine Persistenz;
// Buttons >=80px. Im Standard-Modus wie das Kiosk-Quiz (beste Antwort grün,
// gewählte falsche rot, Score).

import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { Tagesraetsel } from "@/modules/spiele/components/Tagesraetsel";
import type { TagesraetselFrage } from "@/modules/spiele/services/tagesraetsel.service";

const FRAGEN: TagesraetselFrage[] = [
  { q: "Frage eins?", options: ["A", "B", "C", "D"], answer: 1, story: "Geschichte eins." },
  { q: "Frage zwei?", options: ["E", "F", "G", "H"], answer: 0, story: "Geschichte zwei." },
];

let fetchMock: ReturnType<typeof vi.fn>;

describe("Tagesraetsel (SP1-3)", () => {
  afterEach(cleanup);
  beforeEach(() => {
    fetchMock = vi.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  it("zeigt die erste Frage mit vier Optionen", () => {
    render(<Tagesraetsel fragen={FRAGEN} failureFree />);
    expect(screen.getByText("Frage eins?")).toBeDefined();
    expect(screen.getAllByTestId("raetsel-option")).toHaveLength(4);
  });

  it("failure-free: jede Antwort öffnet die Geschichte, KEINE Falsch-Markierung", () => {
    render(<Tagesraetsel fragen={FRAGEN} failureFree />);
    const options = screen.getAllByTestId("raetsel-option");
    // bewusst die FALSCHE Antwort (Index 0; beste ist 1) tippen
    fireEvent.click(options[0]);
    expect(screen.getByTestId("raetsel-story")).toBeDefined();
    expect(screen.getByText(/Geschichte eins\./)).toBeDefined();
    // keine einzige Option darf als "wrong" markiert sein
    const states = screen
      .getAllByTestId("raetsel-option")
      .map((b) => b.getAttribute("data-state"));
    expect(states).not.toContain("wrong");
  });

  it("failure-free: Options-Buttons sind >=80px", () => {
    render(<Tagesraetsel fragen={FRAGEN} failureFree />);
    for (const b of screen.getAllByTestId("raetsel-option")) {
      expect(b.getAttribute("style") ?? "").toContain("80px");
    }
  });

  it("failure-free: speichert nichts (kein fetch/Netzwerkruf beim Antworten)", () => {
    render(<Tagesraetsel fragen={FRAGEN} failureFree />);
    fireEvent.click(screen.getAllByTestId("raetsel-option")[2]);
    fireEvent.click(screen.getByTestId("raetsel-next"));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("failure-free: kein Score am Ende, nur ein freundlicher Abschluss", () => {
    render(<Tagesraetsel fragen={FRAGEN} failureFree />);
    // Frage 1 beantworten + weiter
    fireEvent.click(screen.getAllByTestId("raetsel-option")[0]);
    fireEvent.click(screen.getByTestId("raetsel-next"));
    // Frage 2 beantworten + weiter -> Abschluss
    fireEvent.click(screen.getAllByTestId("raetsel-option")[0]);
    fireEvent.click(screen.getByTestId("raetsel-next"));
    expect(screen.getByTestId("raetsel-finished")).toBeDefined();
    expect(screen.queryByText(/von 2 richtig/i)).toBeNull();
  });

  it("Standard-Modus: markiert beste Antwort und gewählte falsche, zeigt Score", () => {
    render(<Tagesraetsel fragen={FRAGEN} failureFree={false} />);
    const options = screen.getAllByTestId("raetsel-option");
    fireEvent.click(options[0]); // falsch (beste ist 1)
    const states = screen
      .getAllByTestId("raetsel-option")
      .map((b) => b.getAttribute("data-state"));
    expect(states[1]).toBe("best");
    expect(states[0]).toBe("wrong");
    // bis zum Ende -> Score sichtbar
    fireEvent.click(screen.getByTestId("raetsel-next"));
    fireEvent.click(screen.getAllByTestId("raetsel-option")[0]); // Frage 2 beste=0 -> richtig
    fireEvent.click(screen.getByTestId("raetsel-next"));
    expect(screen.getByText(/von 2 richtig/i)).toBeDefined();
  });
});
