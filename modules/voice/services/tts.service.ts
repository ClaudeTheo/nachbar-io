// Nachbar.io — Text-to-Speech Service
// Proxy fuer OpenAI TTS API — gibt MP3 Audio-Stream zurueck

import { ServiceError } from "@/lib/services/service-error";

/** Anfrage-Parameter fuer TTS */
export interface TtsRequest {
  text: string;
  voice?: string;
  speed?: number;
}

/** Validierter + normalisierter TTS-Input */
interface ValidatedTtsInput {
  text: string;
  voice: string;
  speed: number;
}

/**
 * Validiert und normalisiert TTS-Eingabeparameter.
 */
function validateTtsInput(params: TtsRequest): ValidatedTtsInput {
  const text = typeof params.text === "string" ? params.text.trim() : "";
  if (!text) {
    throw new ServiceError("Kein Text angegeben.", 400);
  }
  if (text.length > 1000) {
    throw new ServiceError("Text zu lang (max. 1000 Zeichen).", 400);
  }

  const voice = typeof params.voice === "string" ? params.voice : "nova";
  const speed =
    typeof params.speed === "number" &&
    params.speed >= 0.25 &&
    params.speed <= 4.0
      ? params.speed
      : 1.0;

  return { text, voice, speed };
}

/**
 * Erzeugt Audio via OpenAI TTS API.
 * Gibt einen Response mit Audio-Stream zurueck (audio/mpeg).
 */
export async function synthesizeSpeech(params: TtsRequest): Promise<Response> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new ServiceError("Sprachausgabe nicht verfügbar.", 503);
  }

  const { text, voice, speed } = validateTtsInput(params);

  try {
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
        response_format: "mp3",
      }),
    });

    if (!res.ok) {
      console.error("[voice/tts] OpenAI TTS Fehler:", res.status);
      throw new ServiceError("Sprachausgabe fehlgeschlagen.", 502);
    }

    // Audio-Stream als Response zurueckgeben
    return new Response(res.body, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-cache",
      },
    });
  } catch (err) {
    if (err instanceof ServiceError) throw err;
    console.error("[voice/tts] Netzwerkfehler:", err);
    throw new ServiceError("Sprachausgabe fehlgeschlagen.", 502);
  }
}
