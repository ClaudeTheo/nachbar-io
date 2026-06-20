// __tests__/components/senior/StickyNotesList.test.tsx
// Welle SB-4: Sticky Notes auf dem Senior-Home mit Ein-Tap-„Gesehen"-Quittung.

import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import {
  render,
  screen,
  cleanup,
  fireEvent,
  waitFor,
} from "@testing-library/react";
import { StickyNotesList } from "@/modules/care/components/senior/StickyNotesList";

let fetchMock: ReturnType<typeof vi.fn>;

const STICKIES = [
  { id: "s1", title: "Tochter kommt am Sonntag" },
  { id: "s2", title: "Apotheke hat angerufen" },
];

describe("StickyNotesList (SB-4)", () => {
  afterEach(cleanup);
  beforeEach(() => {
    fetchMock = vi.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  it("rendert nichts ohne Zettel", () => {
    render(<StickyNotesList stickies={[]} />);
    expect(screen.queryByTestId("sticky-notes-list")).toBeNull();
  });

  it("zeigt jeden Zettel mit einem Gesehen-Knopf >=80px", () => {
    render(<StickyNotesList stickies={STICKIES} />);
    expect(screen.getAllByTestId("sticky-note")).toHaveLength(2);
    expect(screen.getByText("Tochter kommt am Sonntag")).toBeDefined();
    const buttons = screen.getAllByTestId("sticky-ack");
    expect(buttons[0].getAttribute("style") ?? "").toContain("80px");
  });

  it("entfernt den Zettel nach erfolgreicher Quittung (POST acknowledge)", async () => {
    fetchMock.mockResolvedValue({ ok: true });
    render(<StickyNotesList stickies={STICKIES} />);

    fireEvent.click(screen.getAllByTestId("sticky-ack")[0]);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/senior/reminders/s1/acknowledge",
        { method: "POST" },
      );
      expect(screen.queryByText("Tochter kommt am Sonntag")).toBeNull();
    });
    expect(screen.getAllByTestId("sticky-note")).toHaveLength(1);
  });

  it("zeigt eine Fehlermeldung wenn die Quittung scheitert — Zettel bleibt", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 409 });
    render(<StickyNotesList stickies={STICKIES} />);

    fireEvent.click(screen.getAllByTestId("sticky-ack")[0]);

    expect(await screen.findByText(/erneut|nicht/i)).toBeDefined();
    expect(screen.getAllByTestId("sticky-note")).toHaveLength(2);
  });
});
