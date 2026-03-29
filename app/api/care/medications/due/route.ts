// app/api/care/medications/due/route.ts
// Nachbar.io — Fällige Medikamente für heute (thin handler)

import { NextRequest, NextResponse } from "next/server";
import {
  requireAuth,
  requireSubscription,
  unauthorizedResponse,
} from "@/lib/care/api-helpers";
import { handleServiceError } from "@/lib/services/service-error";
import { getDueMedications } from "@/modules/care/services/medications-due.service";

// GET /api/care/medications/due — Heute fällige Medikamente
export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (!auth) return unauthorizedResponse();

  const sub = await requireSubscription(auth.supabase, auth.user.id, "plus");
  if (sub instanceof NextResponse) return sub;

  try {
    const seniorId =
      request.nextUrl.searchParams.get("senior_id") ?? auth.user.id;
    const result = await getDueMedications(
      auth.supabase,
      auth.user.id,
      seniorId,
    );
    return NextResponse.json(result);
  } catch (error) {
    return handleServiceError(error);
  }
}
