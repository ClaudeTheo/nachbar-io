// app/api/care/medications/[id]/route.ts
// Nachbar.io — Einzelnes Medikament lesen, aktualisieren, deaktivieren

import { NextRequest, NextResponse } from "next/server";
import {
  requireAuth,
  requireSubscription,
  unauthorizedResponse,
} from "@/lib/care/api-helpers";
import { handleServiceError } from "@/lib/services/service-error";
import {
  getMedication,
  updateMedication,
  deactivateMedication,
} from "@/modules/care/services/medications.service";

// GET /api/care/medications/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const auth = await requireAuth();
  if (!auth) return unauthorizedResponse();
  const sub = await requireSubscription(auth.supabase, auth.user.id, "plus");
  if (sub instanceof NextResponse) return sub;

  try {
    const result = await getMedication(auth.supabase, auth.user.id, id);
    return NextResponse.json(result);
  } catch (error) {
    return handleServiceError(error, request, "/api/care/medications/[id]");
  }
}

// PATCH /api/care/medications/[id] — Medikament aktualisieren
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const auth = await requireAuth();
  if (!auth) return unauthorizedResponse();
  const sub = await requireSubscription(auth.supabase, auth.user.id, "plus");
  if (sub instanceof NextResponse) return sub;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Ungültiges Anfrage-Format" },
      { status: 400 },
    );
  }

  try {
    const result = await updateMedication(
      auth.supabase,
      auth.user.id,
      id,
      body,
    );
    return NextResponse.json(result);
  } catch (error) {
    return handleServiceError(error, request, "/api/care/medications/[id]");
  }
}

// DELETE /api/care/medications/[id] — Medikament deaktivieren (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const auth = await requireAuth();
  if (!auth) return unauthorizedResponse();
  const sub = await requireSubscription(auth.supabase, auth.user.id, "plus");
  if (sub instanceof NextResponse) return sub;

  try {
    const result = await deactivateMedication(auth.supabase, auth.user.id, id);
    return NextResponse.json(result);
  } catch (error) {
    return handleServiceError(error, request, "/api/care/medications/[id]");
  }
}
