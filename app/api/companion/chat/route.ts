// app/api/companion/chat/route.ts
// Nachbar.io — Companion Chat API: Claude-basierter Quartier-Lotse mit Tool Use + Memory

import { NextRequest } from "next/server";
import {
  requireAuth,
  unauthorizedResponse,
  errorResponse,
} from "@/lib/care/api-helpers";
import { processChat } from "@/modules/voice/services/companion-chat.service";
import type { ChatRequest } from "@/modules/voice/services/companion-chat.service";
import { ServiceError } from "@/lib/services/service-error";

export const dynamic = "force-dynamic";

// POST /api/companion/chat — Chat mit dem Quartier-Lotsen
export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (!auth) return unauthorizedResponse();

  let body: ChatRequest;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Ungültiger Request-Body.", 400);
  }

  try {
    return await processChat(body, auth.user.id, auth.supabase);
  } catch (err) {
    if (err instanceof ServiceError) {
      return errorResponse(err.message, err.status);
    }
    console.error("[companion/chat] KI-Fehler:", err);
    return errorResponse("KI-Fehler", 500);
  }
}
