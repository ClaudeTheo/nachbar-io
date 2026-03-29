// app/api/caregiver/invite/route.ts
// Nachbar.io — Caregiver-Einladung erstellen (Thin Handler)

import { NextRequest, NextResponse } from "next/server";
import {
  requireAuth,
  requireSubscription,
  unauthorizedResponse,
} from "@/lib/care/api-helpers";
import { handleServiceError } from "@/lib/services/service-error";
import { createInviteCode } from "@/modules/care/services/caregiver/invite.service";

export async function POST(_request: NextRequest) {
  const auth = await requireAuth();
  if (!auth) return unauthorizedResponse();

  const sub = await requireSubscription(auth.supabase, auth.user.id, "plus");
  if (sub instanceof NextResponse) return sub;

  try {
    const result = await createInviteCode(auth.supabase, auth.user.id);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return handleServiceError(error);
  }
}
