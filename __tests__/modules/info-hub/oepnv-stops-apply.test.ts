// Welle I — Tests fuer applyOepnvStopsForQuarter (POST-Service zu Welle H).

import { describe, expect, it, vi } from "vitest";

import { applyOepnvStopsForQuarter } from "@/modules/info-hub/services/oepnv-stops-apply.service";

type UpdatePayload = Record<string, unknown>;

function createSupabase(updateError?: { message: string }) {
  const update = vi.fn((_payload: UpdatePayload) => ({
    eq: vi.fn(async () => ({
      data: null,
      error: updateError ?? null,
    })),
  }));
  const from = vi.fn(() => ({ update }));
  return { from, _update: update };
}

function lastUpdatePayload(
  supabase: ReturnType<typeof createSupabase>,
): UpdatePayload {
  const calls = supabase._update.mock.calls;
  if (calls.length === 0) {
    throw new Error("update wurde nicht aufgerufen");
  }
  return calls[calls.length - 1][0];
}

describe("applyOepnvStopsForQuarter", () => {
  it("schreibt validierte Stops als JSONB in municipal_config", async () => {
    const supabase = createSupabase();
    const result = await applyOepnvStopsForQuarter(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      supabase as any,
      "qid-1",
      [
        { id: "8506566", name: "Bahnhof" },
        { id: "8000123", name: "Brennet" },
      ],
    );

    expect(result.savedCount).toBe(2);
    expect(supabase.from).toHaveBeenCalledWith("municipal_config");
    expect(supabase._update).toHaveBeenCalledTimes(1);
    const updateArg = lastUpdatePayload(supabase);
    expect(updateArg.oepnv_stops).toEqual([
      { id: "8506566", name: "Bahnhof" },
      { id: "8000123", name: "Brennet" },
    ]);
    expect(typeof updateArg.updated_at).toBe("string");
  });

  it("akzeptiert leere Liste (alle Stops entfernen)", async () => {
    const supabase = createSupabase();
    const result = await applyOepnvStopsForQuarter(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      supabase as any,
      "qid-1",
      [],
    );

    expect(result.savedCount).toBe(0);
    expect(lastUpdatePayload(supabase).oepnv_stops).toEqual([]);
  });

  it("wirft, wenn ein Stop kein id-Feld hat", async () => {
    const supabase = createSupabase();
    await expect(
      applyOepnvStopsForQuarter(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        supabase as any,
        "qid-1",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        [{ name: "X" } as any],
      ),
    ).rejects.toThrow(/id/);
  });

  it("wirft, wenn ein Stop kein name-Feld hat", async () => {
    const supabase = createSupabase();
    await expect(
      applyOepnvStopsForQuarter(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        supabase as any,
        "qid-1",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        [{ id: "1" } as any],
      ),
    ).rejects.toThrow(/name/);
  });

  it("wirft, wenn mehr als 25 Stops uebergeben werden", async () => {
    const supabase = createSupabase();
    const stops = Array.from({ length: 26 }, (_, i) => ({
      id: String(i),
      name: `Stop ${i}`,
    }));
    await expect(
      applyOepnvStopsForQuarter(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        supabase as any,
        "qid-1",
        stops,
      ),
    ).rejects.toThrow(/max|25/);
  });

  it("dedupliziert Stops anhand der id", async () => {
    const supabase = createSupabase();
    const result = await applyOepnvStopsForQuarter(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      supabase as any,
      "qid-1",
      [
        { id: "1", name: "A" },
        { id: "1", name: "A duplikat" },
        { id: "2", name: "B" },
      ],
    );

    expect(result.savedCount).toBe(2);
    expect(lastUpdatePayload(supabase).oepnv_stops).toEqual([
      { id: "1", name: "A" },
      { id: "2", name: "B" },
    ]);
  });

  it("trimmt id und name", async () => {
    const supabase = createSupabase();
    await applyOepnvStopsForQuarter(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      supabase as any,
      "qid-1",
      [{ id: "  1  ", name: "  Bahnhof  " }],
    );

    expect(lastUpdatePayload(supabase).oepnv_stops).toEqual([
      { id: "1", name: "Bahnhof" },
    ]);
  });

  it("wirft bei DB-Fehler", async () => {
    const supabase = createSupabase({ message: "RLS denied" });
    await expect(
      applyOepnvStopsForQuarter(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        supabase as any,
        "qid-1",
        [{ id: "1", name: "X" }],
      ),
    ).rejects.toThrow(/RLS denied/);
  });
});
