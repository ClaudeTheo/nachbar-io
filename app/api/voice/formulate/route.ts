// app/api/voice/formulate/route.ts
// Task H-3: KI-Formulierungshilfe fuer SCHREIBEN-Flow

import { NextRequest, NextResponse } from "next/server";
import {
  requireAuth,
  unauthorizedResponse,
  errorResponse,
} from "@/lib/care/api-helpers";
import { handleServiceError } from "@/lib/services/service-error";
import { formulateMessage } from "@/modules/voice/services/companion-chat.service";
import type { MutLevel } from "@/modules/voice/services/system-prompt";
import {
  AI_HELP_DISABLED_MESSAGE,
  canUsePersonalAi,
} from "@/lib/ai/user-settings";

export const dynamic = "force-dynamic";

interface FormulateBody {
  transcript: string;
  recipientName: string;
  mutLevel?: MutLevel;
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (!auth) return unauthorizedResponse();

  const aiAllowed = await canUsePersonalAi(auth.supabase, auth.user.id);
  if (!aiAllowed) {
    return errorResponse(AI_HELP_DISABLED_MESSAGE, 503);
  }

  let body: FormulateBody;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Ungueltiger Request.", 400);
  }

  if (!body.transcript?.trim()) {
    return errorResponse("Kein Transkript.", 400);
  }

  if (!body.recipientName?.trim()) {
    return errorResponse("Kein Empfaenger.", 400);
  }

  // Mut-Level aus User-Metadata lesen (wie in processChat)
  let mutLevel: MutLevel = body.mutLevel ?? 1;
  if (!body.mutLevel) {
    try {
      const { data: userData } = await auth.supabase
        .from("users")
        .select("raw_user_meta_data")
        .eq("id", auth.user.id)
        .single();
      const rawMut = userData?.raw_user_meta_data?.mut_level;
      if (rawMut === 1 || rawMut === 2 || rawMut === 3 || rawMut === 4) {
        mutLevel = rawMut;
      }
    } catch {
      // Default 1
    }
  }

  try {
    const result = await formulateMessage(
      body.transcript,
      body.recipientName,
      mutLevel,
    );
    // result: { text, event? } — event ist optional (H-6 Termin-Extraktion)
    return NextResponse.json(result);
  } catch (err) {
    return handleServiceError(err);
  }
}
