// Nachbar.io — Whisper Transkriptions-Service
// Proxy fuer OpenAI Whisper API — nimmt Audio, gibt deutschen Text zurueck

import { ServiceError } from "@/lib/services/service-error";

/** Ergebnis der Transkription */
export interface TranscribeResult {
  text: string;
}

/**
 * Transkribiert Audio via OpenAI Whisper API.
 * Erwartet FormData mit einem 'audio' File-Feld.
 */
export async function transcribeAudio(
  formData: FormData,
): Promise<TranscribeResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new ServiceError("Spracherkennung nicht verfügbar.", 503);
  }

  const audio = formData.get("audio") as File | null;
  if (!audio) {
    throw new ServiceError("Keine Audiodatei.", 400);
  }

  // FormData fuer Whisper API aufbauen
  const whisperForm = new FormData();
  whisperForm.append("file", audio, "audio.webm");
  whisperForm.append("model", "whisper-1");
  whisperForm.append("language", "de");

  try {
    const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: whisperForm,
    });

    if (!res.ok) {
      console.error("[voice/transcribe] Whisper API Fehler:", res.status);
      throw new ServiceError("Transkription fehlgeschlagen.", 502);
    }

    const data = await res.json();
    return { text: data.text || "" };
  } catch (err) {
    if (err instanceof ServiceError) throw err;
    console.error("[voice/transcribe] Netzwerkfehler:", err);
    throw new ServiceError("Transkription fehlgeschlagen.", 502);
  }
}
