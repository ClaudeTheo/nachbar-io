// app/api/care/consultations/[id]/status/route.ts
// Nachbar.io — Online-Sprechstunde: Status-Übergänge (nur Host)

import { NextRequest, NextResponse } from "next/server";
import {
  requireAuth,
  requireSubscription,
  unauthorizedResponse,
} from "@/lib/care/api-helpers";
import { handleServiceError } from "@/lib/services/service-error";
import { updateConsultationStatus } from "@/modules/care/services/consultations.service";

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
    return NextResponse.json({ error: "Ungültiges JSON" }, { status: 400 });
  }

  try {
    const data = await updateConsultationStatus(
      auth.supabase,
      id,
      auth.user.id,
      body as Parameters<typeof updateConsultationStatus>[3],
    );
    return NextResponse.json(data);
  } catch (error) {
    return handleServiceError(error);
  }
}
