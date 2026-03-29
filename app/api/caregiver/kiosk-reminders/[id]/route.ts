// app/api/caregiver/kiosk-reminders/[id]/route.ts
// Nachbar.io — Einzelne Kiosk-Erinnerung: Bearbeiten und Loeschen (Thin Handler)

import { NextRequest, NextResponse } from "next/server";
import {
  requireAuth,
  requireSubscription,
  unauthorizedResponse,
  errorResponse,
} from "@/lib/care/api-helpers";
import { handleServiceError } from "@/lib/services/service-error";
import {
  updateKioskReminder,
  deleteKioskReminder,
} from "@/modules/care/services/caregiver/kiosk-reminders.service";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth();
  if (!auth) return unauthorizedResponse();

  const sub = await requireSubscription(auth.supabase, auth.user.id, "plus");
  if (sub instanceof NextResponse) return sub;

  const { id } = await params;

  let body: { title?: string; scheduled_at?: string };
  try {
    body = await request.json();
  } catch {
    return errorResponse("Ungültiger Request-Body", 400);
  }

  try {
    const result = await updateKioskReminder(
      auth.supabase,
      auth.user.id,
      id,
      body,
    );
    return NextResponse.json(result);
  } catch (error) {
    return handleServiceError(error);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth();
  if (!auth) return unauthorizedResponse();

  const sub = await requireSubscription(auth.supabase, auth.user.id, "plus");
  if (sub instanceof NextResponse) return sub;

  const { id } = await params;

  try {
    const result = await deleteKioskReminder(auth.supabase, auth.user.id, id);
    return NextResponse.json(result);
  } catch (error) {
    return handleServiceError(error);
  }
}
