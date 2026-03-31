import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resetFacts } from "@/modules/memory/services/facts.service";
import type { MemoryApiResponse } from "@/modules/memory/types";

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
    const { scope } = body as {
      scope: "basis" | "care_need" | "personal" | "all";
    };

    if (!scope) {
      return NextResponse.json(
        { success: false, data: null, error: "missing_scope" },
        { status: 400 },
      );
    }

    await resetFacts(supabase, user.id, scope, user.id, "senior");

    return NextResponse.json({ success: true, data: null, error: null });
  } catch {
    return NextResponse.json(
      { success: false, data: null, error: "internal_error" },
      { status: 500 },
    );
  }
}
