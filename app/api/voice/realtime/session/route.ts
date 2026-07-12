import {
  errorResponse,
  requireAuth,
  unauthorizedResponse,
} from "@/lib/care/api-helpers";
import {
  AI_HELP_DISABLED_MESSAGE,
  canUsePersonalAi,
} from "@/lib/ai/user-settings";
import { consumeRealtimeVoiceSessionLimit } from "@/lib/ai/rate-limit";
import {
  getRealtimeVoiceMaxSessionSeconds,
  getRealtimeVoiceModel,
  isRealtimeVoiceEnabled,
} from "@/lib/ai/realtime-voice";
import { buildRealtimeVoiceInstructions } from "@/lib/ai/realtime-voice-prompt";
import { DEFAULT_VOICE } from "@/modules/voice/lib/voice-names";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const OPENAI_CLIENT_SECRETS_URL =
  process.env.OPENAI_CLIENT_SECRETS_URL?.trim() ||
  "https://api.openai.com/v1/realtime/client_secrets";

export async function POST(): Promise<Response> {
  if (!isRealtimeVoiceEnabled()) {
    return errorResponse("Realtime-Sprache ist nicht aktiviert.", 503);
  }

  const auth = await requireAuth();
  if (!auth) return unauthorizedResponse();

  if (!(await canUsePersonalAi(auth.supabase, auth.user.id))) {
    return errorResponse(AI_HELP_DISABLED_MESSAGE, 503);
  }

  const rateLimit = await consumeRealtimeVoiceSessionLimit({
    userId: auth.user.id,
  });
  if (rateLimit.unavailable) {
    return errorResponse("Nutzungsschutz ist gerade nicht verfuegbar.", 503);
  }
  if (!rateLimit.allowed) {
    return errorResponse(
      `Maximal ${rateLimit.limit} Sprachsitzungen pro Stunde. Bitte versuchen Sie es spaeter erneut.`,
      429,
    );
  }

  const model = getRealtimeVoiceModel();
  let upstream: Response;
  try {
    upstream = await fetch(OPENAI_CLIENT_SECRETS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY?.trim()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        expires_after: { anchor: "created_at", seconds: 120 },
        session: {
          type: "realtime",
          model,
          instructions: buildRealtimeVoiceInstructions(),
          audio: {
            input: {
              transcription: {
                model: "gpt-4o-mini-transcribe",
                language: "de",
              },
              turn_detection: {
                type: "semantic_vad",
                eagerness: "low",
                create_response: true,
                interrupt_response: true,
              },
            },
            output: { voice: DEFAULT_VOICE },
          },
        },
      }),
    });
  } catch {
    return errorResponse("Sprachdienst ist nicht erreichbar.", 502);
  }

  if (!upstream.ok) {
    return errorResponse("Sprachsitzung konnte nicht gestartet werden.", 502);
  }

  let payload: { value?: string; expires_at?: number };
  try {
    payload = (await upstream.json()) as {
      value?: string;
      expires_at?: number;
    };
  } catch {
    return errorResponse("Ungueltige Antwort des Sprachdienstes.", 502);
  }

  if (!payload.value) {
    return errorResponse("Sprachsitzung konnte nicht gestartet werden.", 502);
  }

  return Response.json({
    clientSecret: payload.value,
    expiresAt: payload.expires_at ?? null,
    model,
    maxSessionSeconds: getRealtimeVoiceMaxSessionSeconds(),
  });
}
