// app/api/care/medications/route.ts
// Nachbar.io — Medikamente auflisten (GET) und anlegen (POST)

import { NextRequest, NextResponse } from "next/server";
import {
  requireAuth,
  requireSubscription,
  unauthorizedResponse,
} from "@/lib/care/api-helpers";
import { handleServiceError } from "@/lib/services/service-error";
import {
  listMedications,
  createMedication,
} from "@/modules/care/services/medications.service";

// GET /api/care/medications — Aktive Medikamente abrufen
export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (!auth) return unauthorizedResponse();
  const sub = await requireSubscription(auth.supabase, auth.user.id, "plus");
  if (sub instanceof NextResponse) return sub;

  try {
    const seniorId =
      request.nextUrl.searchParams.get("senior_id") ?? auth.user.id;
    const includeInactive =
      request.nextUrl.searchParams.get("include_inactive") === "true";
    const result = await listMedications(
      auth.supabase,
      auth.user.id,
      seniorId,
      includeInactive,
    );
    return NextResponse.json(result);
  } catch (error) {
    return handleServiceError(error);
  }
}

// POST /api/care/medications — Neues Medikament anlegen
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
    const result = await createMedication(auth.supabase, auth.user.id, body);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return handleServiceError(error);
  }
}
