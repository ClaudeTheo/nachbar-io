// app/api/care/appointments/[id]/route.ts
// Nachbar.io — Einzelnen Termin lesen, aktualisieren, löschen

import { NextRequest, NextResponse } from "next/server";
import {
  requireAuth,
  requireSubscription,
  unauthorizedResponse,
} from "@/lib/care/api-helpers";
import { handleServiceError } from "@/lib/services/service-error";
import {
  getAppointment,
  updateAppointment,
  deleteAppointment,
} from "@/modules/care/services/appointments.service";

// GET /api/care/appointments/[id]
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
    const data = await getAppointment(auth.supabase, id, auth.user.id);
    return NextResponse.json(data);
  } catch (error) {
    return handleServiceError(error, request, "/api/care/appointments/[id]");
  }
}

// PATCH /api/care/appointments/[id] — Termin aktualisieren
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
    const data = await updateAppointment(auth.supabase, id, {
      userId: auth.user.id,
      updates: body,
    });
    return NextResponse.json(data);
  } catch (error) {
    return handleServiceError(error, request, "/api/care/appointments/[id]");
  }
}

// DELETE /api/care/appointments/[id] — Termin endgültig löschen
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
    const data = await deleteAppointment(auth.supabase, id, auth.user.id);
    return NextResponse.json(data);
  } catch (error) {
    return handleServiceError(error, request, "/api/care/appointments/[id]");
  }
}
