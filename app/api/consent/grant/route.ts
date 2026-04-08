// app/api/consent/grant/route.ts
// Nachbar.io — Bewohner erteilt Einwilligung

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, unauthorizedResponse } from "@/lib/care/api-helpers";
import { handleServiceError } from "@/lib/services/service-error";
import { grantConsent } from "@/lib/services/consent.service";

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (!auth) return unauthorizedResponse();

  try {
    const body = await request.json();
    const result = await grantConsent(auth.supabase, auth.user.id, {
      grantee_id: body.grantee_id,
      grantee_org_id: body.grantee_org_id,
      purpose: body.purpose,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return handleServiceError(error);
  }
}
