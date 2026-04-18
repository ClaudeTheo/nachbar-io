// Nachbar.io — Text-to-Speech Service
// Layer-1 Phrase-Cache: Wiederholte TTS-Phrasen aus Supabase Storage servieren.
//   Cache-Hit  → stream aus tts-cache Bucket (kein OpenAI-Call).
//   Cache-Miss → OpenAI gpt-4o-mini-tts, response tee-en: client sofort,
//                upload asynchron im Hintergrund (darf Response nie blockieren).

import { ServiceError } from "@/lib/services/service-error";
import { getAdminSupabase } from "@/lib/supabase/admin";

export interface TtsRequest {
  text: string;
  voice?: string;
  speed?: number;
}

interface ValidatedTtsInput {
  text: string;
  voice: string;
  speed: number;
  instructions: string;
}

const SENIOR_VOICE_INSTRUCTIONS = `Sprich klares, akzentfreies Hochdeutsch mit viel Emotion und Dynamik.
Deine Stimme ist warm, lebendig und herzlich — wie eine gute Freundin, die sich wirklich freut zu helfen.
Variiere dein Tempo und deine Betonung natuerlich — mal schneller bei spannenden Infos, mal langsamer bei wichtigen Details.
Betone wichtige Informationen wie Uhrzeiten, Adressen und Namen deutlich mit leichtem Nachdruck.
Mache kurze natuerliche Pausen zwischen Saetzen — wie in einem echten Gespraech.
Klinge lebendig, sympathisch und engagiert — NICHT monoton oder roboterhaft.
Zeige Emotion: Freude bei guten Nachrichten, Mitgefuehl bei Sorgen, Begeisterung bei Tipps.
Verwende eine mittlere Tonlage mit natuerlicher Melodie in der Stimme.`;

// Bei Aenderung von SENIOR_VOICE_INSTRUCTIONS auf "v2" bumpen — sonst werden
// alte Audios weiter geliefert.
const INSTRUCTIONS_VERSION = "v1";
const CACHE_BUCKET = "tts-cache";

function validateTtsInput(params: TtsRequest): ValidatedTtsInput {
  const text = typeof params.text === "string" ? params.text.trim() : "";
  if (!text) throw new ServiceError("Kein Text angegeben.", 400);
  if (text.length > 1000)
    throw new ServiceError("Text zu lang (max. 1000 Zeichen).", 400);

  const voice = typeof params.voice === "string" ? params.voice : "ash";
  const speed =
    typeof params.speed === "number" &&
    params.speed >= 0.25 &&
    params.speed <= 4.0
      ? params.speed
      : 0.95;

  return { text, voice, speed, instructions: SENIOR_VOICE_INSTRUCTIONS };
}

/**
 * SHA-256 hex des kanonischen Cache-Inputs.
 * Exportiert fuer Tests. Aenderung der Payload-Struktur = automatischer Invalidate.
 */
export async function computeCacheKey(input: {
  text: string;
  voice: string;
  speed: number;
  instructionsVersion: string;
}): Promise<string> {
  const payload = JSON.stringify({
    text: input.text,
    voice: input.voice,
    speed: input.speed,
    v: input.instructionsVersion,
  });
  const hash = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(payload),
  );
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function publicCacheUrl(key: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) throw new ServiceError("Cache nicht konfiguriert.", 503);
  return `${base.replace(/\/$/, "")}/storage/v1/object/public/${CACHE_BUCKET}/${key}.mp3`;
}

async function checkCacheHit(key: string): Promise<string | null> {
  try {
    const url = publicCacheUrl(key);
    const res = await fetch(url, { method: "HEAD" });
    return res.ok ? url : null;
  } catch {
    return null;
  }
}

async function uploadToCache(key: string, audio: ArrayBuffer): Promise<void> {
  const supa = getAdminSupabase();
  const { error } = await supa.storage
    .from(CACHE_BUCKET)
    .upload(`${key}.mp3`, audio, {
      contentType: "audio/mpeg",
      upsert: false,
    });
  if (error) throw error;
}

export async function synthesizeSpeech(params: TtsRequest): Promise<Response> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new ServiceError("Sprachausgabe nicht verfügbar.", 503);

  const { text, voice, speed, instructions } = validateTtsInput(params);

  const t0 = Date.now();
  const cacheKey = await computeCacheKey({
    text,
    voice,
    speed,
    instructionsVersion: INSTRUCTIONS_VERSION,
  });

  // Layer-1: Cache-Hit?
  const hitUrl = await checkCacheHit(cacheKey);
  const tCache = Date.now();

  if (hitUrl) {
    const hitRes = await fetch(hitUrl);
    if (hitRes.ok && hitRes.body) {
      console.log("[tts-metrics]", {
        cacheHit: true,
        ms_cache: tCache - t0,
        ms_total: Date.now() - t0,
      });
      return new Response(hitRes.body, {
        status: 200,
        headers: {
          "Content-Type": "audio/mpeg",
          "Cache-Control": "public, max-age=3600",
          "X-TTS-Cache": "hit",
        },
      });
    }
    // Hit-URL meldete ok, aber GET schlug fehl → als Miss behandeln.
  }

  // Cache-Miss: OpenAI-Call
  try {
    const tOpenaiStart = Date.now();
    const res = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini-tts",
        input: text,
        voice,
        speed,
        instructions,
        response_format: "mp3",
      }),
    });
    const tFirstByte = Date.now();

    if (!res.ok) {
      console.error("[voice/tts] OpenAI TTS Fehler:", res.status);
      throw new ServiceError("Sprachausgabe fehlgeschlagen.", 502);
    }
    if (!res.body) {
      throw new ServiceError("Sprachausgabe fehlgeschlagen.", 502);
    }

    console.log("[tts-metrics]", {
      cacheHit: false,
      ms_cache: tCache - t0,
      ms_openai_ttfb: tFirstByte - tOpenaiStart,
    });

    // Stream teilen: Client bekommt einen Zweig sofort, Cache-Upload
    // konsumiert den anderen asynchron.
    const [clientStream, cacheStream] = res.body.tee();

    queueMicrotask(async () => {
      try {
        const buf = await new Response(cacheStream).arrayBuffer();
        await uploadToCache(cacheKey, buf);
      } catch (err) {
        console.warn("[voice/tts] cache-upload failed:", err);
      }
    });

    return new Response(clientStream, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-cache",
        "X-TTS-Cache": "miss",
      },
    });
  } catch (err) {
    if (err instanceof ServiceError) throw err;
    console.error("[voice/tts] Netzwerkfehler:", err);
    throw new ServiceError("Sprachausgabe fehlgeschlagen.", 502);
  }
}
