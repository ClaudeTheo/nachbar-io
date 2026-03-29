// app/api/care/reports/[id]/route.ts
// Nachbar.io — Einzelnen Bericht laden

import { NextResponse } from "next/server";
import { requireAuth, requireSubscription } from "@/lib/care/api-helpers";
import { handleServiceError } from "@/lib/services/service-error";
import { getReport } from "@/modules/care/services/reports-routes.service";

/**
 * GET /api/care/reports/[id]
 * Einzelnes Dokument per ID laden.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth();
  if (!auth)
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  // Subscription-Gate: Plus erforderlich
  const sub = await requireSubscription(auth.supabase, auth.user.id, "plus");
  if (sub instanceof NextResponse) return sub;

  try {
    const { id } = await params;
    const result = await getReport(auth.supabase, auth.user.id, id);
    return NextResponse.json(result);
  } catch (error) {
    return handleServiceError(error);
  }
}
