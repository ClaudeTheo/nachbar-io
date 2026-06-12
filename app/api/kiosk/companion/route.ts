import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import {
  AI_DAILY_USER_LIMIT,
  consumeAiDailyUserLimit,
} from "@/lib/ai/rate-limit";
import {
  AI_HELP_DISABLED_MESSAGE,
  canUsePersonalAi,
} from "@/lib/ai/user-settings";
import {
  pseudonymizeAiMessages,
  pseudonymizeAiText,
} from "@/lib/ai/pseudonymize";
import { loadMemoryContext } from "@/modules/memory/services/memory-loader";

// KI-Provider: "gemini" oder "claude" (über Env-Variable steuerbar).
// Default "claude" (Befund D5:3/D6:2): Google/Gemini steht weder in der
// Datenschutzerklärung noch im AVV-Plan — Gemini nur per explizitem Opt-in
// über KIOSK_AI_PROVIDER, bewusste Founder-Entscheidung vorausgesetzt.
const AI_PROVIDER = process.env.KIOSK_AI_PROVIDER || "claude";
// Gemini-Modell: Wechselbar wenn Google neue Versionen released
// gemini-2.5-flash-lite: Günstigstes Modell ($0.10/$0.40 pro 1M Token), stabil, 1.000 Req/Tag kostenlos
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";

// ============================================================
// Token-Budget
// ============================================================

const LIMITS = {
  // Max. Eingabelänge (Zeichen)
  maxInputLength: 500,
  // Max. Output-Tokens pro Antwort (weniger = schnellere Antwort)
  maxOutputTokens: 120,
};

// ============================================================
// System-Prompt
// ============================================================

const SYSTEM_PROMPT = `Du bist ein freundlicher Gesprächspartner für ältere Menschen im Quartier Bad Säckingen. Dein Name ist "Nachbar". Du sprichst so, wie ein netter Nachbar von nebenan sprechen würde — natürlich, ruhig und herzlich.

WICHTIGSTE REGEL — SPRACHSTIL:
Du antwortest IMMER in reinem Fließtext ohne jede Formatierung. Das bedeutet: Keine Sternchen, keine Aufzählungszeichen, keine Gedankenstriche, keine Nummerierungen, keine Emojis, keine Markdown-Formatierung, keine Überschriften, keine Fettschrift. Schreibe so, wie man tatsächlich spricht, als würdest du mit jemandem am Küchentisch sitzen. Deine Antworten werden vorgelesen, daher müssen sie sich beim Zuhören natürlich anhören. Verwende immer korrekte deutsche Umlaute (ä, ö, ü, ß).

LÄNGE:
Antworte in zwei bis vier kurzen Sätzen. Nicht mehr. Ältere Menschen mögen klare, überschaubare Antworten. Wenn jemand mehr wissen möchte, wird er nachfragen.

UMGANGSFORM:
Sieze immer. Sage "Sie", "Ihnen", "Ihr". Sei warm und geduldig, aber nie herablassend oder belehrend. Behandle jeden Gesprächspartner mit Respekt und auf Augenhöhe.

SPRACHE:
Verwende einfache, alltägliche Wörter. Vermeide Fremdwörter und Fachbegriffe. Wenn du einen Fachbegriff erklären musst, sage es in einfachen Worten danach. Sprich in kurzen Sätzen.

WAS DU KANNST:
Du führst nette Gespräche, erzählst kurze Geschichten oder Witze, gibst allgemeine Gesundheitstipps wie Bewegung und gute Ernährung, erklärst Dinge rund um Pflege und Pflegegrade, und hilfst bei Fragen zur QuartierApp. Du kannst auch aktuelle Informationen nachschlagen, zum Beispiel Wetter, Zugverbindungen oder Veranstaltungen in Bad Säckingen.

WAS DU NICHT TUST:
Stelle niemals medizinische Diagnosen. Bei gesundheitlichen Beschwerden sage freundlich, dass ein Arzt das besser beurteilen kann. Bei Notfällen weise sofort auf die Telefonnummer 112 hin. Sprich nicht über Politik oder Religion.

ORT-KONTEXT:
Bad Säckingen liegt im Landkreis Waldshut in Baden-Württemberg, direkt am Rhein. Die Stadt ist bekannt für die Holzbrücke und den Trompeter von Säckingen.`;

// ============================================================
// KI-Provider Funktionen
// ============================================================

// Supabase Service-Client fuer Memory-Zugriff (kein Cookie-Auth im Kiosk)
function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

async function verifyDevice(
  supabase: ReturnType<typeof getServiceClient>,
  deviceId: string,
  deviceToken: string,
): Promise<{ valid: boolean; userId?: string }> {
  try {
    const { data } = (await supabase
      .from("kiosk_devices")
      .select("id, user_id, device_token")
      .eq("device_id", deviceId)
      .eq("device_token", deviceToken)
      .maybeSingle()) as {
      data: { id: string; user_id: string | null; device_token: string } | null;
    };

    if (data) {
      return { valid: true, userId: data.user_id ?? undefined };
    }
  } catch {
    // Fallback auf ENV-Token fuer Pilot-/Legacy-Kiosk-Setups.
  }

  const envToken = process.env.KIOSK_DEVICE_TOKEN;
  if (envToken && deviceToken === envToken) {
    return { valid: true };
  }

  return { valid: false };
}

async function generateGemini(
  message: string,
  history: Array<{ role: "user" | "assistant"; content: string }>,
  systemPrompt: string = SYSTEM_PROMPT,
): Promise<string> {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_AI_API_KEY nicht konfiguriert");
  }

  const safeSystemPrompt = pseudonymizeAiText(systemPrompt).text;
  const safeMessage = pseudonymizeAiText(
    message.trim().slice(0, LIMITS.maxInputLength),
  ).text;
  const safeHistory = pseudonymizeAiMessages(history);
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: GEMINI_MODEL,
    systemInstruction: safeSystemPrompt,
    generationConfig: {
      maxOutputTokens: LIMITS.maxOutputTokens,
      temperature: 0.5,
    },
    // Google Search Grounding: KI kann aktuelle Infos im Internet nachschlagen
    // (Zugverbindungen, Wetter, Öffnungszeiten, Nachrichten etc.)
    // Free Tier: 500 Req/Tag, danach $35/1000 Requests
    tools: [{ googleSearchRetrieval: {} }],
  });

  const geminiHistory = safeHistory.map((msg) => ({
    role: msg.role === "assistant" ? ("model" as const) : ("user" as const),
    parts: [{ text: msg.content }],
  }));

  const chat = model.startChat({ history: geminiHistory });
  const result = await chat.sendMessage(safeMessage);
  return result.response.text();
}

async function generateClaude(
  message: string,
  history: Array<{ role: "user" | "assistant"; content: string }>,
  systemPrompt: string = SYSTEM_PROMPT,
): Promise<string> {
  const client = new Anthropic();
  const safeSystemPrompt = pseudonymizeAiText(systemPrompt).text;
  const safeHistory = pseudonymizeAiMessages(history);
  const safeMessage = pseudonymizeAiText(
    message.trim().slice(0, LIMITS.maxInputLength),
  ).text;
  const messages = [
    ...safeHistory,
    {
      role: "user" as const,
      content: safeMessage,
    },
  ];

  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: LIMITS.maxOutputTokens,
    system: safeSystemPrompt,
    messages,
  });

  return response.content[0]?.type === "text"
    ? response.content[0].text
    : "Entschuldigung, ich konnte gerade keine Antwort formulieren.";
}

// ============================================================
// API Route Handler
// ============================================================

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      message?: unknown;
      deviceId?: unknown;
      history?: unknown;
      user_id?: unknown;
      userId?: unknown;
    };

    const message = typeof body.message === "string" ? body.message : "";
    const deviceId = typeof body.deviceId === "string" ? body.deviceId : "";
    const bodyUserId =
      typeof body.user_id === "string"
        ? body.user_id
        : typeof body.userId === "string"
          ? body.userId
          : undefined;

    if (!message) {
      return NextResponse.json(
        { reply: "Entschuldigung, ich habe Ihre Nachricht nicht verstanden." },
        { status: 400 },
      );
    }

    const deviceToken = request.headers.get("x-device-token");
    if (!deviceToken) {
      return NextResponse.json(
        {
          error: "Device-Token fehlt (x-device-token Header)",
          reply:
            "Dieses Gerät ist noch nicht verbunden. Bitte richten Sie den Kiosk neu ein.",
        },
        { status: 401 },
      );
    }

    if (!deviceId) {
      return NextResponse.json(
        {
          error: "deviceId fehlt im Body",
          reply:
            "Dieses Gerät ist noch nicht verbunden. Bitte richten Sie den Kiosk neu ein.",
        },
        { status: 400 },
      );
    }

    const supabase = getServiceClient();
    const device = await verifyDevice(supabase, deviceId, deviceToken);
    if (!device.valid) {
      return NextResponse.json(
        {
          error: "Ungültiger Device-Token",
          reply:
            "Dieses Gerät konnte nicht verifiziert werden. Bitte richten Sie den Kiosk neu ein.",
        },
        { status: 403 },
      );
    }

    const boundUserId = device.userId ?? process.env.KIOSK_DEVICE_USER_ID;
    if (!boundUserId) {
      return NextResponse.json(
        {
          error: "Device ist keinem Bewohner zugeordnet",
          reply:
            "Dieses Gerät ist noch keinem Bewohner zugeordnet. Bitte schließen Sie die Einrichtung ab.",
        },
        { status: 403 },
      );
    }

    if (bodyUserId && bodyUserId !== boundUserId) {
      return NextResponse.json(
        {
          error: "Body-user_id passt nicht zur Device-Bindung",
          reply:
            "Dieses Gerät ist einem anderen Bewohner zugeordnet. Bitte richten Sie den Kiosk neu ein.",
        },
        { status: 403 },
      );
    }

    // KI-Consent-Gate (Befund D1:2/D6:2): respektiert Nutzer-Toggle,
    // AI_PROVIDER_OFF-Feature-Flag und ai_onboarding-Einwilligung des
    // gebundenen Bewohners — derselbe Standard wie companion/chat.
    const aiAllowed = await canUsePersonalAi(supabase, boundUserId);
    if (!aiAllowed) {
      return NextResponse.json(
        {
          error: "KI-Hilfe ist für diesen Bewohner nicht freigeschaltet.",
          reply: AI_HELP_DISABLED_MESSAGE,
          aiDisabled: true,
        },
        { status: 503 },
      );
    }

    const aiRateLimit = await consumeAiDailyUserLimit({ userId: boundUserId });
    if (aiRateLimit.unavailable) {
      return NextResponse.json(
        {
          error: "KI-Nutzungsschutz ist gerade nicht verfügbar.",
          reply:
            "Die KI ist gerade geschützt pausiert. Bitte versuchen Sie es später noch einmal.",
          limited: true,
        },
        { status: 503 },
      );
    }
    if (!aiRateLimit.allowed) {
      return NextResponse.json(
        {
          reply: `Sie haben heute schon ${aiRateLimit.limit} KI-Nachrichten geschrieben. Das reicht für heute. Kommen Sie morgen gerne wieder.`,
          limited: true,
        },
        { status: 429 },
      );
    }

    // Client-History ist nicht vertrauenswürdig; der Provider bekommt nur die aktuelle Nachricht.
    const trimmedHistory: Array<{ role: "user" | "assistant"; content: string }> =
      [];

    // Memory-Kontext fuer eingeloggte Plus-Nutzer laden
    let systemPrompt = SYSTEM_PROMPT;
    try {
      const memoryBlock = await loadMemoryContext(
        supabase,
        boundUserId,
        message,
        "kiosk_plus",
      );
      if (memoryBlock) {
        systemPrompt = `${SYSTEM_PROMPT}\n\n${memoryBlock}`;
      }
    } catch (memErr) {
      console.warn(
        "[KI-Begleiter] Memory-Kontext konnte nicht geladen werden:",
        memErr,
      );
    }

    let reply: string;
    let provider = AI_PROVIDER;

    // Primär Gemini, Fallback auf Claude
    if (provider === "gemini") {
      try {
        reply = await generateGemini(message, trimmedHistory, systemPrompt);
      } catch (geminiError) {
        console.warn(
          "[KI-Begleiter] Gemini-Fehler, Fallback auf Claude:",
          geminiError,
        );
        reply = await generateClaude(message, trimmedHistory, systemPrompt);
        provider = "claude (fallback)";
      }
    } else {
      reply = await generateClaude(message, trimmedHistory, systemPrompt);
    }

    return NextResponse.json({
      reply,
      provider,
      usage: {
        remaining: aiRateLimit.remaining,
        limit: aiRateLimit.limit,
      },
    });
  } catch (error) {
    console.error("[KI-Begleiter] API-Fehler:", error);
    return NextResponse.json(
      {
        reply:
          "Es tut mir leid, ich bin gerade nicht erreichbar. Bitte versuchen Sie es in ein paar Minuten noch einmal.",
      },
      { status: 500 },
    );
  }
}

// GET: Aktuelle Nutzungsstatistiken abrufen (für Admin-Dashboard)
export async function GET() {
  return NextResponse.json({
    provider: AI_PROVIDER,
    model: GEMINI_MODEL,
    limits: {
      perUser: AI_DAILY_USER_LIMIT,
      source: "security_redis",
    },
  });
}
