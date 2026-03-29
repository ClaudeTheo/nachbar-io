// app/api/care/stats/route.ts
// Nachbar.io — Aggregierte Pflege-Statistiken

import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/care/api-helpers";
import { handleServiceError } from "@/lib/services/service-error";
import { getCareStats } from "@/modules/care/services/stats.service";

/**
 * GET /api/care/stats
 * Aggregierte Statistiken für einen Senior oder systemweit (Admin).
 * Query: ?senior_id=... (optional, Admin bekommt ohne senior_id systemweite Daten)
 */
export async function GET(request: Request) {
  const auth = await requireAuth();
  if (!auth)
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  try {
    const url = new URL(request.url);
    const seniorId = url.searchParams.get("senior_id");
    const result = await getCareStats(auth.supabase, auth.user.id, seniorId);
    return NextResponse.json(result);
  } catch (error) {
    return handleServiceError(error);
  }
}
