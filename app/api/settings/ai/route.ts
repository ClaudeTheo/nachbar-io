import { NextRequest } from "next/server";
import {
  errorResponse,
  requireAuth,
  successResponse,
  unauthorizedResponse,
} from "@/lib/care/api-helpers";
import { getAiHelpState, setAiHelpEnabled } from "@/lib/ai/user-settings";
import { updateConsents } from "@/modules/care/services/consent-routes.service";
import { ServiceError } from "@/lib/services/service-error";

export const dynamic = "force-dynamic";

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

  let body: { ai_enabled?: unknown };
  try {
    body = await request.json();
  } catch {
    return errorResponse("Ungueltiger Request-Body.", 400);
  }

  if (typeof body.ai_enabled !== "boolean") {
    return errorResponse("ai_enabled muss boolean sein.", 400);
  }

  try {
    await updateConsents(auth.supabase, auth.user.id, {
      ai_onboarding: body.ai_enabled,
    });
    const state = await setAiHelpEnabled(
      auth.supabase,
      auth.user.id,
      body.ai_enabled,
      "settings",
    );
    return successResponse(state);
  } catch (err) {
    if (err instanceof ServiceError) return errorResponse(err.message, err.status);
    return errorResponse("KI-Einstellungen konnten nicht gespeichert werden.", 500);
  }
}
