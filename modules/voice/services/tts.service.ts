// Nachbar.io — Text-to-Speech Service
// Proxy fuer OpenAI TTS API — gibt MP3 Audio-Stream zurueck
// Session 59: Seniorenfreundliche Stimme mit instructions-Parameter

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
  instructions: string;
}

/**
 * Voice-Instruktionen fuer die seniorenfreundliche Sprachausgabe.
 * Steuert Tonfall, Tempo und Ausdruck der gpt-4o-mini-tts Stimme.
 */
const SENIOR_VOICE_INSTRUCTIONS = `Sprich klares, akzentfreies Hochdeutsch mit viel Emotion und Dynamik.
Deine Stimme ist warm, lebendig und herzlich — wie eine gute Freundin, die sich wirklich freut zu helfen.
Variiere dein Tempo und deine Betonung natuerlich — mal schneller bei spannenden Infos, mal langsamer bei wichtigen Details.
Betone wichtige Informationen wie Uhrzeiten, Adressen und Namen deutlich mit leichtem Nachdruck.
Mache kurze natuerliche Pausen zwischen Saetzen — wie in einem echten Gespraech.
Klinge lebendig, sympathisch und engagiert — NICHT monoton oder roboterhaft.
Zeige Emotion: Freude bei guten Nachrichten, Mitgefuehl bei Sorgen, Begeisterung bei Tipps.
Verwende eine mittlere Tonlage mit natuerlicher Melodie in der Stimme.`;

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

  // 'ash' klingt warm und natuerlich auf Deutsch, gut fuer Senioren
  const voice = typeof params.voice === "string" ? params.voice : "ash";
  // Etwas langsamer fuer besseres Verstaendnis bei aelteren Menschen
  const speed =
    typeof params.speed === "number" &&
    params.speed >= 0.25 &&
    params.speed <= 4.0
      ? params.speed
      : 0.95;

  return { text, voice, speed, instructions: SENIOR_VOICE_INSTRUCTIONS };
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

  const { text, voice, speed, instructions } = validateTtsInput(params);

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
        instructions,
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
