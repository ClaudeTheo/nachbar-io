import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { revokeConsent } from "@/modules/memory/services/consent.service";
import type {
  MemoryApiResponse,
  MemoryConsentType,
} from "@/modules/memory/types";

export async function POST(
  request: NextRequest,
): Promise<NextResponse<MemoryApiResponse>> {
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
    const { consent_type, target_user_id } = body as {
      consent_type: MemoryConsentType;
      target_user_id?: string;
    };

    if (!consent_type) {
      return NextResponse.json(
        { success: false, data: null, error: "missing_consent_type" },
        { status: 400 },
      );
    }

    const targetUserId = target_user_id || user.id;

    // Codex-Review BLOCKER F6.2: Memory-Consents sind hoechst-persoenlich
    // (DSGVO Art. 7 Abs. 1) und nicht via Pflege-Link delegierbar — auch
    // nicht der Widerruf. Caregiver darf den Status sehen (RLS Mig 174),
    // aber nicht im Namen des Seniors widerrufen.
    if (targetUserId !== user.id) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: "consent_self_only",
        },
        { status: 403 },
      );
    }

    await revokeConsent(supabase, {
      userId: targetUserId,
      consentType: consent_type,
      actorUserId: user.id,
      actorRole: "senior",
    });

    return NextResponse.json({ success: true, data: null, error: null });
  } catch {
    return NextResponse.json(
      { success: false, data: null, error: "internal_error" },
      { status: 500 },
    );
  }
}
