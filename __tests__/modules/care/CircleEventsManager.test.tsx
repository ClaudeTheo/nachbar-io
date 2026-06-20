// __tests__/modules/care/CircleEventsManager.test.tsx
// Welle F3 (Befund C2:5): Angehoeriger sieht + legt Termine fuer den Bewohner an.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  cleanup,
  waitFor,
} from "@testing-library/react";

vi.mock("@/lib/supabase/client", () => ({ createClient: vi.fn(() => ({})) }));

const listUpcomingMock = vi.fn();
vi.mock("@/lib/services/circle-events.service", () => ({
  listUpcoming: (...args: unknown[]) => listUpcomingMock(...args),
}));

import { CircleEventsManager } from "@/modules/care/components/CircleEventsManager";

function makeEvent(over: Record<string, unknown> = {}) {
  return {
    id: "e1",
    resident_id: "s9",
    created_by: "c1",
    scheduled_at: "2026-07-01T10:00:00Z",
    title: "Besuch",
    who_comes: "Maria",
    description: null,
    created_at: "2026-06-01T00:00:00Z",
    deleted_at: null,
    ...over,
  };
}

describe("CircleEventsManager (F3/C2:5)", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    listUpcomingMock.mockReset();
    listUpcomingMock.mockResolvedValue([]);
    fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, json: () => Promise.resolve({ id: "ev-1" }) });
    globalThis.fetch = fetchMock as typeof fetch;
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("zeigt kommende Termine des Bewohners", async () => {
    listUpcomingMock.mockResolvedValue([makeEvent()]);
    render(<CircleEventsManager residentId="s9" residentName="Oma" />);
    expect(await screen.findByText("Besuch")).toBeInTheDocument();
  });

  it("zeigt einen Leerzustand, wenn keine Termine vorliegen", async () => {
    render(<CircleEventsManager residentId="s9" residentName="Oma" />);
    expect(
      await screen.findByText(/keine kommenden Termine/i),
    ).toBeInTheDocument();
  });

  it("legt einen Termin per POST /api/circle-events mit residentId an", async () => {
    render(<CircleEventsManager residentId="s9" residentName="Oma" />);
    await screen.findByText(/keine kommenden Termine/i);

    fireEvent.change(screen.getByLabelText("Wann"), {
      target: { value: "2026-07-01T10:00" },
    });
    fireEvent.change(screen.getByLabelText("Was"), {
      target: { value: "Besuch" },
    });
    fireEvent.change(screen.getByLabelText(/Wer kommt/i), {
      target: { value: "Maria" },
    });
    fireEvent.click(screen.getByRole("button", { name: /ankündigen/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/circle-events",
        expect.objectContaining({ method: "POST" }),
      );
    });
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.residentId).toBe("s9");
    expect(body.title).toBe("Besuch");
    expect(body.whoComes).toBe("Maria");
  });
});
