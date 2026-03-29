// app/api/caregiver/redeem/route.ts
// Nachbar.io — Einladungs-Code einloesen (Thin Handler)

import { NextRequest, NextResponse } from "next/server";
import {
  requireAuth,
  requireSubscription,
  unauthorizedResponse,
  errorResponse,
} from "@/lib/care/api-helpers";
import { handleServiceError } from "@/lib/services/service-error";
import { redeemInviteCode } from "@/modules/care/services/caregiver/redeem.service";

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (!auth) return unauthorizedResponse();

  const sub = await requireSubscription(auth.supabase, auth.user.id, "plus");
  if (sub instanceof NextResponse) return sub;

  let body: { code?: string; relationship_type?: string };
  try {
    body = await request.json();
  } catch {
    return errorResponse("Ungültiges Anfrage-Format", 400);
  }

  try {
    const result = await redeemInviteCode(auth.supabase, auth.user.id, {
      code: body.code ?? "",
      relationship_type: body.relationship_type ?? "",
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return handleServiceError(error);
  }
}
