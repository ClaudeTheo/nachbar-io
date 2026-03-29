// app/api/care/reports/route.ts
// Nachbar.io — Berichte-API: Liste und Generierung

import { NextResponse } from "next/server";
import { requireAuth, requireSubscription } from "@/lib/care/api-helpers";
import { handleServiceError } from "@/lib/services/service-error";
import {
  listReports,
  generateReport,
} from "@/modules/care/services/reports-routes.service";

/**
 * GET /api/care/reports?senior_id=...
 * Liste aller Dokumente für einen Senior.
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
    const seniorId = url.searchParams.get("senior_id");
    const result = await listReports(auth.supabase, auth.user.id, seniorId);
    return NextResponse.json(result);
  } catch (error) {
    return handleServiceError(error);
  }
}

/**
 * POST /api/care/reports
 * Bericht generieren und als Dokument speichern.
 * Body: { type, period_start, period_end, senior_id? }
 */
export async function POST(request: Request) {
  const auth = await requireAuth();
  if (!auth)
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  // Subscription-Gate: Plus erforderlich
  const sub = await requireSubscription(auth.supabase, auth.user.id, "plus");
  if (sub instanceof NextResponse) return sub;

  try {
    const body = await request.json().catch(() => {
      throw { status: 400 };
    });
    const result = await generateReport(auth.supabase, auth.user.id, body);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "status" in error &&
      (error as { status: number }).status === 400 &&
      !("message" in error)
    ) {
      return NextResponse.json(
        { error: "Ungültiger Request-Body" },
        { status: 400 },
      );
    }
    return handleServiceError(error);
  }
}
