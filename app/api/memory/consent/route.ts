import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getConsentStatus } from "@/modules/memory/services/consent.service";
import type { MemoryApiResponse, MemoryConsent } from "@/modules/memory/types";

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
