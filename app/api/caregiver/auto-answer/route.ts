// app/api/caregiver/auto-answer/route.ts
// Nachbar.io — Auto-Answer-Einstellungen fuer Kiosk-Videoanruf (Thin Handler)

import { NextRequest, NextResponse } from "next/server";
import {
  requireAuth,
  requireSubscription,
  unauthorizedResponse,
  errorResponse,
} from "@/lib/care/api-helpers";
import { handleServiceError } from "@/lib/services/service-error";
import {
  getAutoAnswerSettings,
  updateAutoAnswerSettings,
} from "@/modules/care/services/caregiver/caregiver-misc.service";

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (!auth) return unauthorizedResponse();

  const sub = await requireSubscription(auth.supabase, auth.user.id, "plus");
  if (sub instanceof NextResponse) return sub;

  const linkId = request.nextUrl.searchParams.get("linkId");

  try {
    const result = await getAutoAnswerSettings(
      auth.supabase,
      auth.user.id,
      linkId ?? "",
    );
    return NextResponse.json(result);
  } catch (error) {
    return handleServiceError(error);
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAuth();
  if (!auth) return unauthorizedResponse();

  const sub = await requireSubscription(auth.supabase, auth.user.id, "plus");
  if (sub instanceof NextResponse) return sub;

  let body: {
    linkId?: string;
    autoAnswerAllowed?: boolean;
    autoAnswerStart?: string;
    autoAnswerEnd?: string;
  };
  try {
    body = await request.json();
  } catch {
    return errorResponse("Ungültiges Anfrage-Format", 400);
  }

  try {
    const result = await updateAutoAnswerSettings(auth.supabase, auth.user.id, {
      linkId: body.linkId ?? "",
      autoAnswerAllowed: body.autoAnswerAllowed,
      autoAnswerStart: body.autoAnswerStart,
      autoAnswerEnd: body.autoAnswerEnd,
    });
    return NextResponse.json(result);
  } catch (error) {
    return handleServiceError(error);
  }
}
