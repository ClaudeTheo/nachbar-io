// app/api/consent/revoke/route.ts
// Nachbar.io — Bewohner widerruft Einwilligung

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, unauthorizedResponse } from "@/lib/care/api-helpers";
import { handleServiceError } from "@/lib/services/service-error";
import { revokeConsent } from "@/lib/services/consent.service";

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (!auth) return unauthorizedResponse();

  try {
    const body = await request.json();

    if (!body.consent_id) {
      return NextResponse.json(
        { error: "consent_id ist erforderlich" },
        { status: 400 },
      );
    }

    const result = await revokeConsent(
      auth.supabase,
      auth.user.id,
      body.consent_id,
    );
    return NextResponse.json(result);
  } catch (error) {
    return handleServiceError(error);
  }
}
