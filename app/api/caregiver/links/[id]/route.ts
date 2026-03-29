// app/api/caregiver/links/[id]/route.ts
// Nachbar.io — Caregiver-Link aktualisieren (Thin Handler)

import { NextRequest, NextResponse } from "next/server";
import {
  requireAuth,
  requireSubscription,
  unauthorizedResponse,
  errorResponse,
} from "@/lib/care/api-helpers";
import { handleServiceError } from "@/lib/services/service-error";
import { updateCaregiverLink } from "@/modules/care/services/caregiver/links.service";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth();
  if (!auth) return unauthorizedResponse();

  const sub = await requireSubscription(auth.supabase, auth.user.id, "plus");
  if (sub instanceof NextResponse) return sub;

  const { id } = await params;

  let body: { revoke?: boolean; heartbeat_visible?: boolean };
  try {
    body = await request.json();
  } catch {
    return errorResponse("Ungültiges Anfrage-Format", 400);
  }

  try {
    const result = await updateCaregiverLink(
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
