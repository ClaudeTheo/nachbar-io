// app/api/voice/transcribe/route.ts
// Whisper Proxy — Thin Wrapper, Logik in transcribe.service.ts

import { NextRequest, NextResponse } from "next/server";
import {
  requireAuth,
  unauthorizedResponse,
  errorResponse,
} from "@/lib/care/api-helpers";
import { handleServiceError } from "@/lib/services/service-error";
import { transcribeAudio } from "@/modules/voice/services/transcribe.service";
import {
  AI_HELP_DISABLED_MESSAGE,
  canUsePersonalAi,
} from "@/lib/ai/user-settings";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    // Auth: Nur angemeldete Nutzer
    const auth = await requireAuth();
    if (!auth) return unauthorizedResponse();

    const aiAllowed = await canUsePersonalAi(auth.supabase, auth.user.id);
    if (!aiAllowed) {
      return errorResponse(AI_HELP_DISABLED_MESSAGE, 503);
    }

    // FormData parsen
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return errorResponse("Ungültiger Request.", 400);
    }

    const result = await transcribeAudio(formData);
    return NextResponse.json(result);
  } catch (error) {
    return handleServiceError(error);
  }
}
