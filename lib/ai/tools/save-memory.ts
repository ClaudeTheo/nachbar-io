// lib/ai/tools/save-memory.ts
// C4 — save_memory Tool-Adapter fuer die KI-Provider.
//
// Dieser Adapter ist bewusst duenn: alle schwere Logik (4-Stufen-Validation,
// Medizin-Blocklist, AES-Verschluesselung, Audit-Log) liegt bereits in
// modules/memory/services/. Der Adapter uebersetzt AIToolCall -> Service-Call
// und verpackt das Ergebnis in ein Shape, das die KI als Tool-Response lesen
// kann.
//
// Verantwortlichkeiten, die der Adapter NEU hinzufuegt:
//   1. JSON-Schema-Validation des Tool-Inputs der KI.
//   2. Scope-Check (Welle C: Senior-only; Caregiver-Scope folgt in C8).
//   3. Mapping von intern verwendeten Ablehnungsgruenden auf ein
//      stabiles, KI-verstaendliches Vokabular.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { AIToolCall } from "@/lib/ai/types";
import {
  CATEGORY_TO_CONSENT,
  SENSITIVE_CATEGORIES,
  MEMORY_LIMITS,
  type MemoryActorRole,
  type MemoryCategory,
  type MemorySaveProposal,
} from "@/modules/memory/types";
import {
  validateMemorySave,
  saveFact,
  getFactCount,
} from "@/modules/memory/services/facts.service";
import { hasConsent } from "@/modules/memory/services/consent.service";

const VALID_CATEGORIES: readonly MemoryCategory[] = [
  "profile",
  "routine",
  "preference",
  "contact",
  "care_need",
  "personal",
];

// Harte Obergrenze pro Fakt-Value. Verhindert, dass die KI lange Freitexte
// (z.B. medizinische Anamnesen) in die Memory-Schicht pumpt.
const VALUE_MAX_LEN = 500;

export type ParseResult =
  | { ok: true; proposal: MemorySaveProposal }
  | { ok: false; reason: "validation_error"; message: string };

export type SaveMemoryResult =
  | {
      ok: true;
      mode: "save";
      factId: string;
      category: MemoryCategory;
      key: string;
    }
  | {
      ok: true;
      mode: "confirm";
      factId: null;
      category: MemoryCategory;
      key: string;
      value: string;
    }
  | {
      ok: false;
      reason:
        | "validation_error"
        | "scope_violation"
        | "consent_missing"
        | "medical_blocked"
        | "limit_reached"
        | "db_error";
      message: string;
    };

export interface SaveMemoryContext {
  actor: { userId: string; role: MemoryActorRole };
  targetUserId: string;
  supabase: SupabaseClient;
}

/**
 * Validiert einen AIToolCall gegen das save_memory-Schema (siehe
 * modules/memory/services/chat-integration.ts#buildMemoryTool).
 *
 * Pure Funktion, kein DB-Zugriff, gut testbar.
 */
export function parseToolInput(toolCall: AIToolCall): ParseResult {
  if (toolCall.name !== "save_memory") {
    return {
      ok: false,
      reason: "validation_error",
      message: `unknown tool: ${toolCall.name}`,
    };
  }

  const input = toolCall.input ?? {};

  const category = input["category"];
  if (
    typeof category !== "string" ||
    !VALID_CATEGORIES.includes(category as MemoryCategory)
  ) {
    return {
      ok: false,
      reason: "validation_error",
      message: "category missing or not in allowed enum",
    };
  }

  const key = input["key"];
  if (typeof key !== "string" || key.trim().length === 0) {
    return {
      ok: false,
      reason: "validation_error",
      message: "key missing or whitespace-only",
    };
  }

  const value = input["value"];
  if (typeof value !== "string" || value.length === 0) {
    return {
      ok: false,
      reason: "validation_error",
      message: "value missing or empty",
    };
  }
  if (value.length > VALUE_MAX_LEN) {
    return {
      ok: false,
      reason: "validation_error",
      message: `value exceeds ${VALUE_MAX_LEN} chars`,
    };
  }

  const confidence = input["confidence"];
  if (
    typeof confidence !== "number" ||
    Number.isNaN(confidence) ||
    confidence < 0 ||
    confidence > 1
  ) {
    return {
      ok: false,
      reason: "validation_error",
      message: "confidence must be a number in [0,1]",
    };
  }

  const needs_confirmation = input["needs_confirmation"];
  if (typeof needs_confirmation !== "boolean") {
    return {
      ok: false,
      reason: "validation_error",
      message: "needs_confirmation must be boolean",
    };
  }

  return {
    ok: true,
    proposal: {
      category: category as MemoryCategory,
      key: key.trim(),
      value,
      confidence,
      needs_confirmation,
    },
  };
}

/**
 * Fuehrt einen save_memory-Tool-Call aus. Reihenfolge der Pruefungen:
 *   1. Tool-Input-Schema (parseToolInput).
 *   2. Scope (Senior schreibt ueber sich selbst, Welle C).
 *   3. Consent + Fakt-Count aus der DB holen.
 *   4. validateMemorySave: Limit -> Consent -> Medizin-Blocklist -> Auto/Confirm-Mode.
 *   5. Bei mode='save' -> saveFact (inkl. AES-Verschluesselung + Audit-Log).
 *   6. Bei mode='confirm' -> Proposal ungespeichert zurueck, UI fragt nach.
 */
export async function saveMemoryToolHandler(
  toolCall: AIToolCall,
  ctx: SaveMemoryContext,
): Promise<SaveMemoryResult> {
  const parsed = parseToolInput(toolCall);
  if (!parsed.ok) return parsed;

  // Welle C: nur Senior darf ueber sich selbst speichern. Caregiver-Scope
  // (via aktivem caregiver_link) kommt in C8.
  if (ctx.actor.role !== "senior") {
    return {
      ok: false,
      reason: "scope_violation",
      message: `actor role '${ctx.actor.role}' nicht erlaubt in Welle C (Senior-only)`,
    };
  }
  if (ctx.targetUserId !== ctx.actor.userId) {
    return {
      ok: false,
      reason: "scope_violation",
      message: "Senior kann nur ueber sich selbst speichern",
    };
  }

  const consentType = CATEGORY_TO_CONSENT[parsed.proposal.category];
  const sensitive = SENSITIVE_CATEGORIES.includes(parsed.proposal.category);
  const [consentGranted, factCount] = await Promise.all([
    hasConsent(ctx.supabase, ctx.targetUserId, consentType),
    getFactCount(ctx.supabase, ctx.targetUserId, sensitive),
  ]);
  const maxFacts = sensitive
    ? MEMORY_LIMITS.SENSITIVE_MAX
    : MEMORY_LIMITS.BASIS_MAX;

  const decision = validateMemorySave(parsed.proposal, {
    hasConsent: consentGranted,
    factCount,
    maxFacts,
  });

  if (!decision.allowed) {
    return {
      ok: false,
      reason: mapRejectionReason(decision.reason),
      message: `memory rejected: ${decision.reason ?? "unknown"}`,
    };
  }

  if (decision.mode === "confirm") {
    return {
      ok: true,
      mode: "confirm",
      factId: null,
      category: parsed.proposal.category,
      key: parsed.proposal.key,
      value: parsed.proposal.value,
    };
  }

  try {
    const fact = await saveFact(ctx.supabase, {
      category: parsed.proposal.category,
      key: parsed.proposal.key,
      value: parsed.proposal.value,
      source: "ai_learned",
      sourceUserId: ctx.actor.userId,
      confidence: parsed.proposal.confidence,
      confirmed: false,
    });
    return {
      ok: true,
      mode: "save",
      factId: fact.id,
      category: parsed.proposal.category,
      key: parsed.proposal.key,
    };
  } catch (e) {
    return {
      ok: false,
      reason: "db_error",
      message: e instanceof Error ? e.message : String(e),
    };
  }
}

type RejectionReason =
  | "consent_missing"
  | "medical_blocked"
  | "limit_reached"
  | "validation_error";

function mapRejectionReason(reason: string | undefined): RejectionReason {
  switch (reason) {
    case "no_consent":
      return "consent_missing";
    case "medical_blocked":
      return "medical_blocked";
    case "limit_reached":
      return "limit_reached";
    default:
      return "validation_error";
  }
}
