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
    const { category, key, value } = body as {
      category: MemoryCategory;
      key: string;
      value: string;
    };

    if (!category || !key || !value) {
      return NextResponse.json(
        { success: false, data: null, error: "missing_fields" },
        { status: 400 },
      );
    }

    // Consent pruefen
    const consentType = CATEGORY_TO_CONSENT[category];
    if (!(await hasConsent(supabase, user.id, consentType))) {
      return NextResponse.json(
        { success: false, data: null, error: "no_consent" },
        { status: 403 },
      );
    }

    // Validierung
    const isSensitive = SENSITIVE_CATEGORIES.includes(category);
    const factCount = await getFactCount(supabase, user.id, isSensitive);
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

    const fact = await saveFact(supabase, {
      category,
      key,
      value,
      source: "self",
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
