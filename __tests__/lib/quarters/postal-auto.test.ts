// __tests__/lib/quarters/postal-auto.test.ts
// Tests fuer A3-Pivot (PLZ-Auto-Quartier-Bildung):
// findOrCreateQuarterByPostalCode soll fuer eine PLZ ein Quartier finden
// oder neu anlegen. Phase 1: scope='postal', auto_created=true. Race-safe
// durch UNIQUE-Index aus Mig 178 (idx_quarters_postal_auto_unique).
//
// Erster User in einer PLZ wird durch den Registration-Service zum
// quarter_admin gemacht (Test dafuer separat).

import { describe, it, expect, vi, beforeEach } from "vitest";
import { findOrCreateQuarterByPostalCode } from "@/lib/quarters/postal-auto";

describe("findOrCreateQuarterByPostalCode (A3-Pivot, Mig 178)", () => {
  let selectChain: ReturnType<typeof makeSelectChain>;
  let insertChain: ReturnType<typeof makeInsertChain>;
  let mockFrom: ReturnType<typeof vi.fn>;
  let adminDb: { from: typeof mockFrom };

  function makeSelectChain(initial: { id: string; name: string } | null) {
    return {
      maybeSingle: vi.fn().mockResolvedValue({ data: initial, error: null }),
    };
  }

  function makeInsertChain(result: {
    data: { id: string; name: string } | null;
    error: unknown;
  }) {
    return {
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue(result),
      }),
    };
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("gibt bestehendes PLZ-Quartier zurueck wenn vorhanden", async () => {
    selectChain = makeSelectChain({
      id: "existing-q-79713",
      name: "Quartier 79713 Bad Saeckingen",
    });
    insertChain = makeInsertChain({ data: null, error: null });
    mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: selectChain.maybeSingle,
          }),
        }),
      }),
      insert: vi.fn().mockReturnValue(insertChain),
    });
    adminDb = { from: mockFrom };

    const result = await findOrCreateQuarterByPostalCode(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      adminDb as any,
      "79713",
      "Bad Saeckingen",
    );

    expect(result).toEqual({
      id: "existing-q-79713",
      name: "Quartier 79713 Bad Saeckingen",
      isNew: false,
    });
    // Kein Insert wenn bereits vorhanden
    expect(insertChain.select).not.toHaveBeenCalled();
  });

  it("legt neues PLZ-Quartier an wenn nicht vorhanden, gibt isNew=true zurueck", async () => {
    selectChain = makeSelectChain(null);
    insertChain = makeInsertChain({
      data: { id: "new-q-22301", name: "Quartier 22301 Hamburg" },
      error: null,
    });
    const insertSpy = vi.fn().mockReturnValue(insertChain);
    mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: selectChain.maybeSingle,
          }),
        }),
      }),
      insert: insertSpy,
    });
    adminDb = { from: mockFrom };

    const result = await findOrCreateQuarterByPostalCode(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      adminDb as any,
      "22301",
      "Hamburg",
    );

    expect(result).toEqual({
      id: "new-q-22301",
      name: "Quartier 22301 Hamburg",
      isNew: true,
    });
    expect(insertSpy).toHaveBeenCalledTimes(1);
    const insertArg = insertSpy.mock.calls[0][0] as Record<string, unknown>;
    expect(insertArg.postal_code).toBe("22301");
    expect(insertArg.city).toBe("Hamburg");
    expect(insertArg.name).toBe("Quartier 22301 Hamburg");
    expect(insertArg.auto_created).toBe(true);
    expect(insertArg.scope).toBe("postal");
    expect(insertArg.country).toBe("DE");
  });

  it("Race-Safety: bei UNIQUE-Konflikt (23505) erneut SELECT, gibt vorhandenes Quartier zurueck", async () => {
    let selectCallCount = 0;
    const maybeSingle = vi.fn().mockImplementation(() => {
      selectCallCount += 1;
      // 1. SELECT: nichts da. 2. SELECT (nach Konflikt): Quartier vom Race-Winner
      if (selectCallCount === 1) return { data: null, error: null };
      return {
        data: { id: "race-winner-q", name: "Quartier 12345 Berlin" },
        error: null,
      };
    });

    insertChain = makeInsertChain({
      data: null,
      error: { code: "23505", message: "duplicate key" },
    });

    mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle,
          }),
        }),
      }),
      insert: vi.fn().mockReturnValue(insertChain),
    });
    adminDb = { from: mockFrom };

    const result = await findOrCreateQuarterByPostalCode(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      adminDb as any,
      "12345",
      "Berlin",
    );

    expect(result).toEqual({
      id: "race-winner-q",
      name: "Quartier 12345 Berlin",
      isNew: false, // Race-Winner war jemand anderes
    });
    expect(selectCallCount).toBe(2);
  });

  it("normalisiert PLZ (trim + non-numeric raus)", async () => {
    selectChain = makeSelectChain(null);
    insertChain = makeInsertChain({
      data: { id: "n-q", name: "Quartier 79713 Bad Saeckingen" },
      error: null,
    });
    const eqSpy1 = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        maybeSingle: selectChain.maybeSingle,
      }),
    });
    mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({ eq: eqSpy1 }),
      insert: vi.fn().mockReturnValue(insertChain),
    });
    adminDb = { from: mockFrom };

    await findOrCreateQuarterByPostalCode(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      adminDb as any,
      " 79713 ",
      "  Bad Saeckingen  ",
    );

    // Erster eq() ist auf postal_code mit normalisiertem Wert
    expect(eqSpy1).toHaveBeenCalledWith("postal_code", "79713");
  });

  it("wirft Fehler bei leerer PLZ (Caller muss vorher validieren)", async () => {
    mockFrom = vi.fn();
    adminDb = { from: mockFrom };

    await expect(
      findOrCreateQuarterByPostalCode(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        adminDb as any,
        "",
        "Hamburg",
      ),
    ).rejects.toThrow(/PLZ/i);
    expect(mockFrom).not.toHaveBeenCalled();
  });
});
