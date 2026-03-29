// app/api/care/reports/data/route.ts
// Nachbar.io — Bericht-Daten (JSON) für Client-Rendering

import { NextResponse } from "next/server";
import { requireAuth, requireSubscription } from "@/lib/care/api-helpers";
import { handleServiceError } from "@/lib/services/service-error";
import { getReportData } from "@/modules/care/services/reports-routes.service";

/**
 * GET /api/care/reports/data?senior_id=...&period_start=...&period_end=...&type=...
 * Gibt Bericht-Daten als JSON zurück für Client-seitiges Rendering.
 */
export async function GET(request: Request) {
  const auth = await requireAuth();
  if (!auth)
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  // Subscription-Gate: Plus erforderlich
  const sub = await requireSubscription(auth.supabase, auth.user.id, "plus");
  if (sub instanceof NextResponse) return sub;

  try {
    const url = new URL(request.url);
    const result = await getReportData(auth.supabase, auth.user.id, {
      seniorId: url.searchParams.get("senior_id") ?? auth.user.id,
      periodStart: url.searchParams.get("period_start") ?? "",
      periodEnd: url.searchParams.get("period_end") ?? "",
      type: url.searchParams.get("type") ?? "",
    });
    return NextResponse.json(result);
  } catch (error) {
    return handleServiceError(error);
  }
}
