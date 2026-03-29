// app/api/care/consultations/[id]/route.ts
// Nachbar.io — Patienten-API: Terminverhandlung (Bestätigen/Gegenvorschlag/Ablehnen)

import { NextRequest, NextResponse } from "next/server";
import {
  requireAuth,
  requireSubscription,
  unauthorizedResponse,
} from "@/lib/care/api-helpers";
import { handleServiceError } from "@/lib/services/service-error";
import { negotiateConsultation } from "@/modules/care/services/consultations.service";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const auth = await requireAuth();
  if (!auth) return unauthorizedResponse();

  const sub = await requireSubscription(auth.supabase, auth.user.id, "plus");
  if (sub instanceof NextResponse) return sub;

  let body: { action?: string; scheduled_at?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ungültiges JSON" }, { status: 400 });
  }

  try {
    const data = await negotiateConsultation(
      auth.supabase,
      id,
      auth.user.id,
      body,
    );
    return NextResponse.json(data);
  } catch (error) {
    return handleServiceError(error);
  }
}
