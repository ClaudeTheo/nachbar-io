import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getFacts,
  saveFact,
  getFactCount,
  validateMemorySave,
} from "@/modules/memory/services/facts.service";
import { hasConsent } from "@/modules/memory/services/consent.service";
import type {
  MemoryApiResponse,
  MemoryFact,
  MemoryCategory,
} from "@/modules/memory/types";
import {
  SENSITIVE_CATEGORIES,
  MEMORY_LIMITS,
  CATEGORY_TO_CONSENT,
} from "@/modules/memory/types";

export async function GET(
  request: NextRequest,
): Promise<NextResponse<MemoryApiResponse<MemoryFact[]>>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, data: null, error: "unauthorized" },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category") as MemoryCategory | null;

    const facts = await getFacts(
      supabase,
      user.id,
      category ? { category } : undefined,
    );
    return NextResponse.json({ success: true, data: facts, error: null });
  } catch {
    return NextResponse.json(
      { success: false, data: null, error: "internal_error" },
      { status: 500 },
    );
  }
}

export async function POST(
  request: NextRequest,
): Promise<NextResponse<MemoryApiResponse<MemoryFact>>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, data: null, error: "unauthorized" },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { category, key, value, targetUserId, source } = body as {
      category: MemoryCategory;
      key: string;
      value: string;
      targetUserId?: string;
      source?: "self" | "ai_learned";
    };

    if (!category || !key || !value) {
      return NextResponse.json(
        { success: false, data: null, error: "missing_fields" },
        { status: 400 },
      );
    }

    // Codex-Review NACHBESSERN F2: optionale Provenance.
    // - "self"        = User hat den Fakt selbst eingegeben (Default).
    // - "ai_learned"  = KI hat ihn vorgeschlagen, User hat im Wizard
    //                   bestaetigt (confirm-mode aus save_memory-Tool).
    // Whitelist verhindert dass Clients beliebige Source-Werte injizieren.
    const explicitSource: "self" | "ai_learned" =
      source === "ai_learned" ? "ai_learned" : "self";

    // Caregiver-Modus: targetUserId = Senior, fuer den gespeichert wird
    const isCaregiver = targetUserId && targetUserId !== user.id;
    const effectiveUserId = isCaregiver ? targetUserId : user.id;

    // Bei Caregiver: pruefen ob aktiver Link existiert
    if (isCaregiver) {
      const { data: link } = await supabase
        .from("caregiver_links")
        .select("id")
        .eq("caregiver_id", user.id)
        .eq("resident_id", targetUserId)
        .is("revoked_at", null)
        .single();

      if (!link) {
        return NextResponse.json(
          { success: false, data: null, error: "no_caregiver_link" },
          { status: 403 },
        );
      }
    }

    // Consent pruefen (fuer den Ziel-User)
    const consentType = CATEGORY_TO_CONSENT[category];
    if (!(await hasConsent(supabase, effectiveUserId, consentType))) {
      return NextResponse.json(
        { success: false, data: null, error: "no_consent" },
        { status: 403 },
      );
    }

    // Validierung
    const isSensitive = SENSITIVE_CATEGORIES.includes(category);
    const factCount = await getFactCount(
      supabase,
      effectiveUserId,
      isSensitive,
    );
    const maxFacts = isSensitive
      ? MEMORY_LIMITS.SENSITIVE_MAX
      : MEMORY_LIMITS.BASIS_MAX;

    const decision = validateMemorySave(
      { category, key, value, confidence: 1.0, needs_confirmation: false },
      { hasConsent: true, factCount, maxFacts },
    );

    if (!decision.allowed) {
      return NextResponse.json(
        { success: false, data: null, error: decision.reason || "blocked" },
        { status: 403 },
      );
    }

    // Caregiver-Source ueberschreibt explicitSource — Pflege-Interaktionen
    // sollen immer als "caregiver" geloggt werden.
    const finalSource: "self" | "caregiver" | "ai_learned" = isCaregiver
      ? "caregiver"
      : explicitSource;

    const fact = await saveFact(supabase, {
      category,
      key,
      value,
      targetUserId: effectiveUserId,
      source: finalSource,
      sourceUserId: user.id,
      confidence: 1.0,
      confirmed: true,
    });

    return NextResponse.json({ success: true, data: fact, error: null });
  } catch {
    return NextResponse.json(
      { success: false, data: null, error: "internal_error" },
      { status: 500 },
    );
  }
}
