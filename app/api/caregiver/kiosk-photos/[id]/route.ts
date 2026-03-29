// app/api/caregiver/kiosk-photos/[id]/route.ts
// Nachbar.io — Einzelnes Kiosk-Foto: Bearbeiten und Loeschen (Thin Handler)

import { NextRequest, NextResponse } from "next/server";
import {
  requireAuth,
  requireSubscription,
  unauthorizedResponse,
  errorResponse,
} from "@/lib/care/api-helpers";
import { handleServiceError } from "@/lib/services/service-error";
import {
  updateKioskPhoto,
  deleteKioskPhoto,
} from "@/modules/care/services/caregiver/kiosk-photos.service";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth();
  if (!auth) return unauthorizedResponse();

  const sub = await requireSubscription(auth.supabase, auth.user.id, "plus");
  if (sub instanceof NextResponse) return sub;

  const { id } = await params;

  let body: { caption?: string; pinned?: boolean; visible?: boolean };
  try {
    body = await request.json();
  } catch {
    return errorResponse("Ungültiger Request-Body", 400);
  }

  try {
    const result = await updateKioskPhoto(
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
    const result = await deleteKioskPhoto(auth.supabase, auth.user.id, id);
    return NextResponse.json(result);
  } catch (error) {
    return handleServiceError(error);
  }
}
