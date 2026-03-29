// app/api/care/consultations/[id]/book/route.ts
// Nachbar.io — Online-Sprechstunde: Termin buchen

import { NextRequest, NextResponse } from "next/server";
import {
  requireAuth,
  requireSubscription,
  unauthorizedResponse,
} from "@/lib/care/api-helpers";
import { handleServiceError } from "@/lib/services/service-error";
import { bookConsultation } from "@/modules/care/services/consultations.service";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const auth = await requireAuth();
  if (!auth) return unauthorizedResponse();

  const sub = await requireSubscription(auth.supabase, auth.user.id, "plus");
  if (sub instanceof NextResponse) return sub;

  try {
    const data = await bookConsultation(auth.supabase, id, auth.user.id);
    return NextResponse.json(data);
  } catch (error) {
    return handleServiceError(error);
  }
}
