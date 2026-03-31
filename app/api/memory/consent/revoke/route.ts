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

    await revokeConsent(supabase, {
      userId: targetUserId,
      consentType: consent_type,
      actorUserId: user.id,
      actorRole: targetUserId === user.id ? "senior" : "caregiver",
    });

    return NextResponse.json({ success: true, data: null, error: null });
  } catch {
    return NextResponse.json(
      { success: false, data: null, error: "internal_error" },
      { status: 500 },
    );
  }
}
