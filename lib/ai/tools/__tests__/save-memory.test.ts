// lib/ai/tools/__tests__/save-memory.test.ts
// C4 — save_memory Adapter Tests
// Deckt Tool-Input-Validation, Scope-Check (Welle C: Senior-only), Consent-Fetch,
// Integration in bestehenden validateMemorySave, Save-Flow, AI-Result-Shape.

import { describe, expect, it, vi, beforeEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AIToolCall } from "@/lib/ai/types";

// Services aus modules/memory mocken. validateMemorySave bleibt real (pure Function).
vi.mock("@/modules/memory/services/facts.service", async () => {
  const actual = await vi.importActual<
    typeof import("@/modules/memory/services/facts.service")
  >("@/modules/memory/services/facts.service");
  return {
    ...actual,
    saveFact: vi.fn(),
    getFactCount: vi.fn(),
  };
});

vi.mock("@/modules/memory/services/consent.service", () => ({
  hasConsent: vi.fn(),
}));

import {
  parseToolInput,
  saveMemoryToolHandler,
  type SaveMemoryResult,
} from "../save-memory";
import {
  saveFact,
  getFactCount,
} from "@/modules/memory/services/facts.service";
import { hasConsent } from "@/modules/memory/services/consent.service";

const mockSaveFact = saveFact as unknown as ReturnType<typeof vi.fn>;
const mockGetFactCount = getFactCount as unknown as ReturnType<typeof vi.fn>;
const mockHasConsent = hasConsent as unknown as ReturnType<typeof vi.fn>;

const SENIOR_ID = "user-senior-001";
const OTHER_ID = "user-other-999";
const mockSupabase = {} as unknown as SupabaseClient;

const defaultCtx = {
  actor: { userId: SENIOR_ID, role: "senior" as const },
  targetUserId: SENIOR_ID,
  supabase: mockSupabase,
};

function toolCall(input: Record<string, unknown>): AIToolCall {
  return { name: "save_memory", input };
}

beforeEach(() => {
  mockSaveFact.mockReset();
  mockGetFactCount.mockReset();
  mockHasConsent.mockReset();
  mockGetFactCount.mockResolvedValue(0);
  mockHasConsent.mockResolvedValue(true);
});

// ---------------------------------------------------------------------------
// parseToolInput (pure) — Tool-Input-Schema-Validation
// ---------------------------------------------------------------------------

describe("parseToolInput", () => {
  const validInput = {
    category: "profile",
    key: "name",
    value: "Thomas",
    confidence: 0.9,
    needs_confirmation: false,
  };

  it("akzeptiert vollstaendigen validen Input", () => {
    const result = parseToolInput(toolCall(validInput));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.proposal.category).toBe("profile");
      expect(result.proposal.key).toBe("name");
      expect(result.proposal.value).toBe("Thomas");
      expect(result.proposal.confidence).toBe(0.9);
      expect(result.proposal.needs_confirmation).toBe(false);
    }
  });

  it("lehnt ab wenn category fehlt", () => {
    const { category: _unused, ...rest } = validInput;
    const result = parseToolInput(toolCall(rest));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("validation_error");
  });

  it("lehnt ab wenn category ausserhalb Enum ist", () => {
    const result = parseToolInput(
      toolCall({ ...validInput, category: "diagnosis" }),
    );
    expect(result.ok).toBe(false);
  });

  it("lehnt ab wenn key leer ist", () => {
    const result = parseToolInput(toolCall({ ...validInput, key: "" }));
    expect(result.ok).toBe(false);
  });

  it("lehnt ab wenn key nur Whitespace ist", () => {
    const result = parseToolInput(toolCall({ ...validInput, key: "   " }));
    expect(result.ok).toBe(false);
  });

  it("lehnt ab wenn value leer ist", () => {
    const result = parseToolInput(toolCall({ ...validInput, value: "" }));
    expect(result.ok).toBe(false);
  });

  it("lehnt ab wenn value laenger als Limit ist (500 Zeichen)", () => {
    const longValue = "a".repeat(501);
    const result = parseToolInput(
      toolCall({ ...validInput, value: longValue }),
    );
    expect(result.ok).toBe(false);
  });

  it("lehnt ab wenn confidence > 1", () => {
    const result = parseToolInput(toolCall({ ...validInput, confidence: 1.5 }));
    expect(result.ok).toBe(false);
  });

  it("lehnt ab wenn confidence < 0", () => {
    const result = parseToolInput(
      toolCall({ ...validInput, confidence: -0.1 }),
    );
    expect(result.ok).toBe(false);
  });

  it("lehnt ab wenn confidence keine Zahl ist", () => {
    const result = parseToolInput(
      toolCall({ ...validInput, confidence: "high" }),
    );
    expect(result.ok).toBe(false);
  });

  it("lehnt ab wenn needs_confirmation kein boolean ist", () => {
    const result = parseToolInput(
      toolCall({ ...validInput, needs_confirmation: "yes" }),
    );
    expect(result.ok).toBe(false);
  });

  it("lehnt ab wenn tool name nicht save_memory ist", () => {
    const result = parseToolInput({ name: "other_tool", input: validInput });
    expect(result.ok).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// saveMemoryToolHandler — Scope-Check (Welle C: Senior-only)
// ---------------------------------------------------------------------------

describe("saveMemoryToolHandler — Scope-Check", () => {
  const baseInput = {
    category: "profile",
    key: "name",
    value: "Thomas",
    confidence: 0.9,
    needs_confirmation: false,
  };

  it("lehnt Caregiver-Actor in Welle C ab (scope_violation)", async () => {
    const result = await saveMemoryToolHandler(toolCall(baseInput), {
      ...defaultCtx,
      actor: { userId: "caregiver-001", role: "caregiver" },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("scope_violation");
    expect(mockSaveFact).not.toHaveBeenCalled();
  });

  it("lehnt AI-Actor ab (scope_violation)", async () => {
    const result = await saveMemoryToolHandler(toolCall(baseInput), {
      ...defaultCtx,
      actor: { userId: SENIOR_ID, role: "ai" },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("scope_violation");
  });

  it("lehnt Senior ab, der ueber anderen Nutzer speichern will (scope_violation)", async () => {
    const result = await saveMemoryToolHandler(toolCall(baseInput), {
      ...defaultCtx,
      targetUserId: OTHER_ID,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("scope_violation");
    expect(mockSaveFact).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// saveMemoryToolHandler — Validation via validateMemorySave (real)
// ---------------------------------------------------------------------------

describe("saveMemoryToolHandler — validateMemorySave-Integration", () => {
  const sensitiveInput = {
    category: "care_need",
    key: "mobilitaet",
    value: "Rollator im Bad",
    confidence: 0.9,
    needs_confirmation: false,
  };
  const basisInput = {
    category: "profile",
    key: "hobby",
    value: "Wandern",
    confidence: 0.9,
    needs_confirmation: false,
  };

  it("lehnt sensitive Kategorie ohne Consent ab (consent_missing)", async () => {
    mockHasConsent.mockResolvedValue(false);
    const result = await saveMemoryToolHandler(
      toolCall(sensitiveInput),
      defaultCtx,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("consent_missing");
    expect(mockHasConsent).toHaveBeenCalledWith(
      mockSupabase,
      SENIOR_ID,
      "memory_care",
    );
    expect(mockSaveFact).not.toHaveBeenCalled();
  });

  it("lehnt Wert mit Medizin-Begriff ab (medical_blocked)", async () => {
    const result = await saveMemoryToolHandler(
      toolCall({ ...basisInput, value: "Diabetes seit 2015" }),
      defaultCtx,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("medical_blocked");
    expect(mockSaveFact).not.toHaveBeenCalled();
  });

  it("lehnt ab wenn Fakt-Limit erreicht ist (limit_reached)", async () => {
    mockGetFactCount.mockResolvedValue(50); // BASIS_MAX
    const result = await saveMemoryToolHandler(
      toolCall(basisInput),
      defaultCtx,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("limit_reached");
  });

  it("fragt Count fuer sensitive separat ab", async () => {
    mockGetFactCount.mockResolvedValue(0);
    mockSaveFact.mockResolvedValue({
      id: "fact-001",
      category: "care_need",
      key: "mobilitaet",
      value: "Rollator im Bad",
    });
    await saveMemoryToolHandler(
      toolCall({ ...sensitiveInput, needs_confirmation: true }),
      defaultCtx,
    );
    // sensitive=true fuer care_need
    expect(mockGetFactCount).toHaveBeenCalledWith(
      mockSupabase,
      SENIOR_ID,
      true,
    );
  });
});

// ---------------------------------------------------------------------------
// saveMemoryToolHandler — Save vs. Confirm-Flow
// ---------------------------------------------------------------------------

describe("saveMemoryToolHandler — Save-Flow", () => {
  const highConfBasis = {
    category: "profile",
    key: "hobby",
    value: "Wandern",
    confidence: 0.9,
    needs_confirmation: false,
  };

  it("speichert basis-Fakt bei hoher Confidence direkt (mode=save)", async () => {
    mockSaveFact.mockResolvedValue({
      id: "fact-abc",
      category: "profile",
      key: "hobby",
      value: "Wandern",
    });

    const result = await saveMemoryToolHandler(
      toolCall(highConfBasis),
      defaultCtx,
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.mode).toBe("save");
      expect(result.factId).toBe("fact-abc");
      expect(result.category).toBe("profile");
      expect(result.key).toBe("hobby");
    }
    expect(mockSaveFact).toHaveBeenCalledTimes(1);
    expect(mockSaveFact).toHaveBeenCalledWith(
      mockSupabase,
      expect.objectContaining({
        category: "profile",
        key: "hobby",
        value: "Wandern",
        source: "ai_learned",
        sourceUserId: SENIOR_ID,
        confidence: 0.9,
      }),
    );
  });

  it("verlangt Bestaetigung bei sensitive Kategorien auch bei hoher Confidence (mode=confirm)", async () => {
    const sensitiveInput = {
      category: "care_need",
      key: "mobilitaet",
      value: "Rollator im Bad",
      confidence: 0.95,
      needs_confirmation: false,
    };
    const result = await saveMemoryToolHandler(
      toolCall(sensitiveInput),
      defaultCtx,
    );

    expect(result.ok).toBe(true);
    if (result.ok && result.mode === "confirm") {
      expect(result.factId).toBeNull();
      expect(result.value).toBe("Rollator im Bad");
    } else {
      throw new Error("expected confirm-mode result");
    }
    expect(mockSaveFact).not.toHaveBeenCalled();
  });

  it("verlangt Bestaetigung bei needs_confirmation=true (mode=confirm)", async () => {
    const result = await saveMemoryToolHandler(
      toolCall({ ...highConfBasis, needs_confirmation: true }),
      defaultCtx,
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.mode).toBe("confirm");
    expect(mockSaveFact).not.toHaveBeenCalled();
  });

  it("verlangt Bestaetigung bei niedriger Confidence (<0.8)", async () => {
    const result = await saveMemoryToolHandler(
      toolCall({ ...highConfBasis, confidence: 0.5 }),
      defaultCtx,
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.mode).toBe("confirm");
    expect(mockSaveFact).not.toHaveBeenCalled();
  });

  it("uebertraegt Fehler aus saveFact als db_error", async () => {
    mockSaveFact.mockRejectedValue(new Error("RLS violation"));
    const result = await saveMemoryToolHandler(
      toolCall(highConfBasis),
      defaultCtx,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("db_error");
      expect(result.message).toContain("RLS violation");
    }
  });

  it("gibt validation_error zurueck bei kaputtem Tool-Input", async () => {
    const result: SaveMemoryResult = await saveMemoryToolHandler(
      toolCall({ category: "unknown" }),
      defaultCtx,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("validation_error");
    expect(mockSaveFact).not.toHaveBeenCalled();
    expect(mockHasConsent).not.toHaveBeenCalled();
  });
});
