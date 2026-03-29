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

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    // Auth: Nur angemeldete Nutzer
    const auth = await requireAuth();
    if (!auth) return unauthorizedResponse();

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
