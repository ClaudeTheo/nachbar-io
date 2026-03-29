// app/api/voice/tts/route.ts
// OpenAI TTS Proxy — Thin Wrapper, Logik in tts.service.ts

import { NextRequest } from "next/server";
import {
  requireAuth,
  unauthorizedResponse,
  errorResponse,
} from "@/lib/care/api-helpers";
import { handleServiceError } from "@/lib/services/service-error";
import { synthesizeSpeech } from "@/modules/voice/services/tts.service";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    // Auth: Nur angemeldete Nutzer
    const auth = await requireAuth();
    if (!auth) return unauthorizedResponse();

    // Body parsen
    let body: { text?: unknown; voice?: unknown; speed?: unknown };
    try {
      body = await request.json();
    } catch {
      return errorResponse("Ungültiger Request.", 400);
    }

    // Service gibt fertigen Response mit Audio-Stream zurueck
    return await synthesizeSpeech({
      text: typeof body.text === "string" ? body.text : "",
      voice: typeof body.voice === "string" ? body.voice : undefined,
      speed: typeof body.speed === "number" ? body.speed : undefined,
    });
  } catch (error) {
    return handleServiceError(error);
  }
}
