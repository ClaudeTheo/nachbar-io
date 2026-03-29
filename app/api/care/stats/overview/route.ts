// app/api/care/stats/overview/route.ts
// Nachbar.io — Plattform-Übersicht Statistiken (Admin)

import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/care/api-helpers";
import { handleServiceError } from "@/lib/services/service-error";
import { getCareOverview } from "@/modules/care/services/stats.service";

/**
 * GET /api/care/stats/overview
 * Umfassende plattformweite Statistiken (nur Admin).
 * Fuer Investoren-Praesentationen und Pilot-Bewertung.
 */
export async function GET() {
  const auth = await requireAuth();
  if (!auth)
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  try {
    const result = await getCareOverview(auth.supabase, auth.user.id);
    return NextResponse.json(result);
  } catch (error) {
    return handleServiceError(error);
  }
}
