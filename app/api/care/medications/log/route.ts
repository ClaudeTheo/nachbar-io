// app/api/care/medications/log/route.ts
// Nachbar.io — Medikamenten-Einnahme protokollieren (POST) und Log abrufen (GET) (thin handler)

import { NextRequest, NextResponse } from "next/server";
import {
  requireAuth,
  requireSubscription,
  unauthorizedResponse,
} from "@/lib/care/api-helpers";
import { handleServiceError } from "@/lib/services/service-error";
import {
  logMedicationIntake,
  getMedicationLog,
} from "@/modules/care/services/medications-log.service";

// POST /api/care/medications/log — Einnahme protokollieren
export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (!auth) return unauthorizedResponse();

  const sub = await requireSubscription(auth.supabase, auth.user.id, "plus");
  if (sub instanceof NextResponse) return sub;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Ungültiges Anfrage-Format" },
      { status: 400 },
    );
  }

  try {
    const result = await logMedicationIntake(auth.supabase, auth.user.id, body);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return handleServiceError(error);
  }
}

// GET /api/care/medications/log — Log-Historie abrufen
export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (!auth) return unauthorizedResponse();

  const sub = await requireSubscription(auth.supabase, auth.user.id, "plus");
  if (sub instanceof NextResponse) return sub;

  try {
    const { searchParams } = request.nextUrl;
    const seniorId = searchParams.get("senior_id") ?? auth.user.id;
    const medicationId = searchParams.get("medication_id");
    const limit = Math.min(
      parseInt(searchParams.get("limit") ?? "50", 10) || 50,
      100,
    );
    const result = await getMedicationLog(
      auth.supabase,
      auth.user.id,
      seniorId,
      medicationId,
      limit,
    );
    return NextResponse.json(result);
  } catch (error) {
    return handleServiceError(error);
  }
}
