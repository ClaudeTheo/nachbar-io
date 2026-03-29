// app/api/caregiver/links/route.ts
// Nachbar.io — Caregiver-Links auflisten (Thin Handler)

import { NextRequest, NextResponse } from "next/server";
import {
  requireAuth,
  requireSubscription,
  unauthorizedResponse,
} from "@/lib/care/api-helpers";
import { handleServiceError } from "@/lib/services/service-error";
import { listCaregiverLinks } from "@/modules/care/services/caregiver/links.service";

export async function GET(_request: NextRequest) {
  const auth = await requireAuth();
  if (!auth) return unauthorizedResponse();

  const sub = await requireSubscription(auth.supabase, auth.user.id, "plus");
  if (sub instanceof NextResponse) return sub;

  try {
    const result = await listCaregiverLinks(auth.supabase, auth.user.id);
    return NextResponse.json(result);
  } catch (error) {
    return handleServiceError(error);
  }
}
