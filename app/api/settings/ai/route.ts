import { NextRequest } from "next/server";
import {
  errorResponse,
  requireAuth,
  successResponse,
  unauthorizedResponse,
} from "@/lib/care/api-helpers";
import {
  getAiHelpState,
  setAiAssistanceLevel,
  setAiHelpEnabled,
} from "@/lib/ai/user-settings";
import {
  isAiAssistanceLevel,
  type AiAssistanceLevel,
} from "@/lib/ki-help/ai-assistance-levels";
import { ServiceError } from "@/lib/services/service-error";

export const dynamic = "force-dynamic";

type SettingsAiBody = {
  ai_enabled?: unknown;
  ai_assistance_level?: unknown;
};

export async function GET(_request: NextRequest) {
  const auth = await requireAuth();
  if (!auth) return unauthorizedResponse();

  try {
    return successResponse(await getAiHelpState(auth.supabase, auth.user.id));
  } catch (err) {
    if (err instanceof ServiceError) return errorResponse(err.message, err.status);
    return errorResponse("KI-Einstellungen konnten nicht geladen werden.", 500);
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (!auth) return unauthorizedResponse();

  let body: SettingsAiBody;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Ungueltiger Request-Body.", 400);
  }

  try {
    if ("ai_assistance_level" in body) {
      if (!isAiAssistanceLevel(body.ai_assistance_level)) {
        return errorResponse(
          "ai_assistance_level ungueltig. Erlaubt: off, basic, everyday, later.",
          400,
        );
      }
      const state = await setAiAssistanceLevel(
        auth.supabase,
        auth.user.id,
        body.ai_assistance_level as AiAssistanceLevel,
        "settings",
      );
      return successResponse(state);
    }

    if (typeof body.ai_enabled === "boolean") {
      const state = await setAiHelpEnabled(
        auth.supabase,
        auth.user.id,
        body.ai_enabled,
        "settings",
      );
      return successResponse(state);
    }

    return errorResponse(
      "ai_assistance_level oder ai_enabled erforderlich.",
      400,
    );
  } catch (err) {
    if (err instanceof ServiceError) return errorResponse(err.message, err.status);
    return errorResponse("KI-Einstellungen konnten nicht gespeichert werden.", 500);
  }
}
