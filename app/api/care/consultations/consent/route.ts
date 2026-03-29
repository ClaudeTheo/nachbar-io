// app/api/care/consultations/consent/route.ts
// Nachbar.io — API-Route für DSGVO-Einwilligung zur Online-Sprechstunde

import { NextRequest, NextResponse } from "next/server";
import {
  requireAuth,
  requireSubscription,
  unauthorizedResponse,
} from "@/lib/care/api-helpers";
import { handleServiceError } from "@/lib/services/service-error";
import {
  getConsultationConsent,
  grantConsultationConsent,
} from "@/modules/care/services/consultations.service";

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (!auth) return unauthorizedResponse();

  const sub = await requireSubscription(auth.supabase, auth.user.id, "plus");
  if (sub instanceof NextResponse) return sub;

  try {
    const providerType =
      request.nextUrl.searchParams.get("provider_type") || "community";
    const data = await getConsultationConsent(
      auth.supabase,
      auth.user.id,
      providerType,
    );
    return NextResponse.json(data);
  } catch (error) {
    return handleServiceError(error);
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (!auth) return unauthorizedResponse();

  const sub = await requireSubscription(auth.supabase, auth.user.id, "plus");
  if (sub instanceof NextResponse) return sub;

  let body: { provider_type?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ungültiges JSON" }, { status: 400 });
  }

  try {
    const data = await grantConsultationConsent(
      auth.supabase,
      auth.user.id,
      body.provider_type || "community",
    );
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return handleServiceError(error);
  }
}
