// app/api/consent/list/route.ts
// Nachbar.io — Bewohner sieht eigene Einwilligungen

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, unauthorizedResponse } from "@/lib/care/api-helpers";
import { handleServiceError } from "@/lib/services/service-error";
import { listConsents } from "@/lib/services/consent.service";

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (!auth) return unauthorizedResponse();

  try {
    const url = new URL(request.url);
    const includeRevoked = url.searchParams.get("include_revoked") === "true";
    const consents = await listConsents(
      auth.supabase,
      auth.user.id,
      includeRevoked,
    );
    return NextResponse.json(consents);
  } catch (error) {
    return handleServiceError(error);
  }
}
