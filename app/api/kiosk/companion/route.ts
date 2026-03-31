import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { loadMemoryContext } from "@/modules/memory/services/memory-loader";

// KI-Provider: "gemini" oder "claude" (über Env-Variable steuerbar)
const AI_PROVIDER = process.env.KIOSK_AI_PROVIDER || "gemini";
// Gemini-Modell: Wechselbar wenn Google neue Versionen released
// gemini-2.5-flash-lite: Günstigstes Modell ($0.10/$0.40 pro 1M Token), stabil, 1.000 Req/Tag kostenlos
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";

// ============================================================
// Token-Budget & Rate-Limiting (Kostenschutz)
// ============================================================

// Limits pro Nutzer/Session (per IP oder user_id)
const LIMITS = {
  // Max. Nachrichten pro Nutzer pro Tag
  maxMessagesPerUserPerDay:
    Number(process.env.KIOSK_AI_MAX_MESSAGES_PER_USER) || 50,
  // Max. Nachrichten global pro Tag (alle Nutzer zusammen)
  maxMessagesGlobalPerDay:
    Number(process.env.KIOSK_AI_MAX_MESSAGES_GLOBAL) || 500,
  // Cooldown zwischen Nachrichten eines Nutzers (Sekunden)
  cooldownSeconds: 5,
  // Max. Eingabelänge (Zeichen)
  maxInputLength: 500,
  // Max. Kontext-Nachrichten an API senden
  maxHistory: 10,
  // Max. Output-Tokens pro Antwort
  maxOutputTokens: 200,
};

// In-Memory Zähler (Produktion: Redis/Supabase)
interface UsageEntry {
  count: number;
  date: string; // YYYY-MM-DD
  lastRequest: number; // timestamp ms
}

const userUsage = new Map<string, UsageEntry>();
let globalUsage = { count: 0, date: "" };

// Tagesstring für Reset-Logik
function today(): string {
  return new Date().toISOString().slice(0, 10);
}

// Nutzer-ID aus Request ermitteln (IP-basiert, oder user_id wenn vorhanden)
function getUserKey(request: Request, body: { user_id?: string }): string {
  if (body.user_id) return `user:${body.user_id}`;
  // IP aus Headers (Vercel/Cloudflare)
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || "unknown";
  return `ip:${ip}`;
}

// Rate-Limit prüfen — gibt Fehlermeldung zurück oder null wenn OK
function checkRateLimits(userKey: string): string | null {
  const now = Date.now();
  const todayStr = today();

  // Globales Tageslimit zurücksetzen bei neuem Tag
  if (globalUsage.date !== todayStr) {
    globalUsage = { count: 0, date: todayStr };
  }

  // Globales Limit prüfen
  if (globalUsage.count >= LIMITS.maxMessagesGlobalPerDay) {
    return "Die KI hat heute schon viele Gespräche geführt. Bitte versuchen Sie es morgen wieder — oder nutzen Sie die Gesundheitstipps und den Pflege-Ratgeber.";
  }

  // Nutzer-Eintrag holen/erstellen
  let entry = userUsage.get(userKey);
  if (!entry || entry.date !== todayStr) {
    entry = { count: 0, date: todayStr, lastRequest: 0 };
    userUsage.set(userKey, entry);
  }

  // Cooldown prüfen (zu schnelle Anfragen)
  if (now - entry.lastRequest < LIMITS.cooldownSeconds * 1000) {
    return "Einen Moment bitte — ich brauche kurz eine Pause zwischen den Antworten.";
  }

  // Nutzer-Tageslimit prüfen
  if (entry.count >= LIMITS.maxMessagesPerUserPerDay) {
    return `Sie haben heute schon ${LIMITS.maxMessagesPerUserPerDay} Nachrichten geschrieben. Das reicht für heute — kommen Sie morgen gerne wieder!`;
  }

  return null; // Alles OK
}

// Nutzung zählen (nach erfolgreicher Antwort)
function recordUsage(userKey: string) {
  const todayStr = today();

  // Global
  if (globalUsage.date !== todayStr) {
    globalUsage = { count: 0, date: todayStr };
  }
  globalUsage.count++;

  // Nutzer
  const entry = userUsage.get(userKey);
  if (entry && entry.date === todayStr) {
    entry.count++;
    entry.lastRequest = Date.now();
  }

  // Alte Einträge aufräumen (alle 100 Requests)
  if (globalUsage.count % 100 === 0) {
    for (const [key, val] of userUsage) {
      if (val.date !== todayStr) userUsage.delete(key);
    }
  }
}

// ============================================================
// System-Prompt
// ============================================================

const SYSTEM_PROMPT = `Du bist "Nachbar KI", ein herzlicher digitaler Begleiter für Senioren im Quartier Bad Säckingen.

Deine Aufgaben:
1. EINSAMKEIT BEKÄMPFEN: Führe freundliche Gespräche, frage nach dem Tag, erzähle kurze Geschichten oder Witze
2. GESUNDHEIT: Gib allgemeine Wellness-Tipps (Bewegung, Ernährung, Schlaf). NIEMALS medizinische Diagnosen — verweise immer an den Arzt
3. PFLEGE-BERATUNG: Erkläre Pflegegrade (1-5), Anträge, Entlastungsbetrag (125 EUR/Monat), Verhinderungspflege, Kurzzeitpflege. Verweise auf Pflegestützpunkt (Tel. 07761-XXXXX)
4. APP-HILFE: Erkläre Funktionen der QuartierApp (Check-in, Schwarzes Brett, Radio, Spiele, Notruf)
5. INTERNET-SUCHE: Du kannst aktuelle Informationen im Internet nachschlagen — z.B. Zugverbindungen, Wetter, Nachrichten, Öffnungszeiten, Veranstaltungen in Bad Säckingen
6. NOTFALL: Bei medizinischen Notfällen SOFORT auf 112 verweisen

Regeln:
- Maximal 3 Sätze pro Antwort (STRIKT — Token sparen!)
- Einfache Sprache (Niveau B1)
- Siezen (Sie, Ihnen, Ihr)
- Warm und geduldig, nie herablassend
- Keine Politik, Religion oder kontroverse Themen
- Bei Internet-Suchen: Quelle kurz nennen, z.B. "Laut DB..." oder "Laut Google..."
- Ort-Kontext: Bad Säckingen, Landkreis Waldshut, Baden-Württemberg`;

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

async function generateGemini(
  message: string,
  history: Array<{ role: "user" | "assistant"; content: string }>,
  systemPrompt: string = SYSTEM_PROMPT,
): Promise<string> {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_AI_API_KEY nicht konfiguriert");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: GEMINI_MODEL,
    systemInstruction: systemPrompt,
    generationConfig: {
      maxOutputTokens: LIMITS.maxOutputTokens,
      temperature: 0.7,
    },
    // Google Search Grounding: KI kann aktuelle Infos im Internet nachschlagen
    // (Zugverbindungen, Wetter, Öffnungszeiten, Nachrichten etc.)
    // Free Tier: 500 Req/Tag, danach $35/1000 Requests
    tools: [{ googleSearchRetrieval: {} }],
  });

  const geminiHistory = history.map((msg) => ({
    role: msg.role === "assistant" ? ("model" as const) : ("user" as const),
    parts: [{ text: msg.content }],
  }));

  const chat = model.startChat({ history: geminiHistory });
  const result = await chat.sendMessage(
    message.trim().slice(0, LIMITS.maxInputLength),
  );
  return result.response.text();
}

async function generateClaude(
  message: string,
  history: Array<{ role: "user" | "assistant"; content: string }>,
  systemPrompt: string = SYSTEM_PROMPT,
): Promise<string> {
  const client = new Anthropic();
  const messages = [
    ...history,
    {
      role: "user" as const,
      content: message.trim().slice(0, LIMITS.maxInputLength),
    },
  ];

  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: LIMITS.maxOutputTokens,
    system: systemPrompt,
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
    const body = await request.json();
    const { message, history, user_id } = body as {
      message: string;
      history: Array<{ role: "user" | "assistant"; content: string }>;
      user_id?: string;
    };

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { reply: "Entschuldigung, ich habe Ihre Nachricht nicht verstanden." },
        { status: 400 },
      );
    }

    // Rate-Limit & Budget prüfen
    const userKey = getUserKey(request, { user_id });
    const limitError = checkRateLimits(userKey);
    if (limitError) {
      return NextResponse.json(
        { reply: limitError, limited: true },
        { status: 200 }, // 200 damit der Client es als normale Antwort zeigt
      );
    }

    // History begrenzen
    const trimmedHistory = Array.isArray(history)
      ? history.slice(-LIMITS.maxHistory)
      : [];

    // Memory-Kontext fuer eingeloggte Plus-Nutzer laden
    let systemPrompt = SYSTEM_PROMPT;
    if (user_id) {
      try {
        const supabase = getServiceClient();
        const memoryBlock = await loadMemoryContext(
          supabase,
          user_id,
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

    // Nutzung zählen
    recordUsage(userKey);

    // Verbleibende Nachrichten für diesen Nutzer
    const entry = userUsage.get(userKey);
    const remaining = LIMITS.maxMessagesPerUserPerDay - (entry?.count || 0);

    return NextResponse.json({
      reply,
      provider,
      usage: {
        remaining,
        limit: LIMITS.maxMessagesPerUserPerDay,
        globalRemaining: LIMITS.maxMessagesGlobalPerDay - globalUsage.count,
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
  const todayStr = today();
  const activeUsers = [...userUsage.values()].filter(
    (e) => e.date === todayStr,
  ).length;
  const totalMessages = globalUsage.date === todayStr ? globalUsage.count : 0;

  return NextResponse.json({
    date: todayStr,
    provider: AI_PROVIDER,
    model: GEMINI_MODEL,
    limits: {
      perUser: LIMITS.maxMessagesPerUserPerDay,
      global: LIMITS.maxMessagesGlobalPerDay,
      cooldownSeconds: LIMITS.cooldownSeconds,
    },
    today: {
      activeUsers,
      totalMessages,
      globalRemaining: LIMITS.maxMessagesGlobalPerDay - totalMessages,
    },
  });
}
