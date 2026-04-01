import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getConsentStatus,
  grantConsent,
} from "@/modules/memory/services/consent.service";
import type {
  MemoryApiResponse,
  MemoryConsent,
  MemoryConsentType,
} from "@/modules/memory/types";

export async function GET(): Promise<
  NextResponse<MemoryApiResponse<MemoryConsent[]>>
> {
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

    const consents = await getConsentStatus(supabase, user.id);
    return NextResponse.json({ success: true, data: consents, error: null });
  } catch {
    return NextResponse.json(
      { success: false, data: null, error: "internal_error" },
      { status: 500 },
    );
  }
}

const VALID_CONSENT_TYPES: MemoryConsentType[] = [
  "memory_basis",
  "memory_care",
  "memory_personal",
];

export async function POST(
  request: NextRequest,
): Promise<NextResponse<MemoryApiResponse<null>>> {
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
    const { consent_type } = body as { consent_type: string };

    if (
      !consent_type ||
      !VALID_CONSENT_TYPES.includes(consent_type as MemoryConsentType)
    ) {
      return NextResponse.json(
        { success: false, data: null, error: "invalid_consent_type" },
        { status: 400 },
      );
    }

    await grantConsent(supabase, {
      userId: user.id,
      consentType: consent_type as MemoryConsentType,
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
