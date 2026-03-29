import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { recomputeReputation } from "@/lib/services/misc-utilities.service";
import { handleServiceError } from "@/lib/services/service-error";

/**
 * POST /api/reputation/recompute
 *
 * Berechnet die Reputation-Stats eines Nutzers neu und speichert sie im Cache.
 * Body: { userId?: string } — Nur Admins dürfen fremde User-IDs angeben.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  let targetUserId: string | undefined;
  try {
    const body = await request.json();
    targetUserId = body.userId;
  } catch {
    // Leerer Body ist ok — eigener Nutzer wird verwendet
  }

  try {
    const result = await recomputeReputation(supabase, user.id, targetUserId);
    return NextResponse.json(result);
  } catch (error) {
    return handleServiceError(error);
  }
}
