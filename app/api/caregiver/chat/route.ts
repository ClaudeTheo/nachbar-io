// app/api/caregiver/chat/route.ts
// Nachbar.io — Caregiver-Chat Konversation erstellen/finden (Thin Handler)

import { NextRequest, NextResponse } from "next/server";
import {
  requireAuth,
  requireSubscription,
  unauthorizedResponse,
  errorResponse,
} from "@/lib/care/api-helpers";
import { handleServiceError } from "@/lib/services/service-error";
import { findOrCreateConversation } from "@/modules/care/services/caregiver/caregiver-misc.service";

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (!auth) return unauthorizedResponse();

  const sub = await requireSubscription(auth.supabase, auth.user.id, "plus");
  if (sub instanceof NextResponse) return sub;

  let body: { resident_id?: string };
  try {
    body = await request.json();
  } catch {
    return errorResponse("Ungültiges Anfrage-Format", 400);
  }

  try {
    const result = await findOrCreateConversation(
      auth.supabase,
      auth.user.id,
      body.resident_id ?? "",
    );
    return NextResponse.json(result);
  } catch (error) {
    return handleServiceError(error);
  }
}
