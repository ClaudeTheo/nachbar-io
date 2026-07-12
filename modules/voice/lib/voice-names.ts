// modules/voice/lib/voice-names.ts
// Zentrale Stimmen-Zuordnung fuer OpenAI gpt-4o-mini-tts.
//
// Stimmen-Wechsel 2026-07 (Founder-Entscheid, wie Lern-App-Sprachtrainer):
// neue Stimmen-Generation marin (weiblich) / cedar (maennlich) — laut
// OpenAI-Doku "For best quality, we recommend using marin or cedar".
// Alt-Werte aus gespeicherten Praeferenzen (nova, ash, onyx) werden beim
// Lesen migriert; gespeichert wird ab jetzt nur noch marin/cedar.

export const FEMALE_VOICE = "marin";
export const MALE_VOICE = "cedar";
export const DEFAULT_VOICE = FEMALE_VOICE;

export type VoiceName = typeof FEMALE_VOICE | typeof MALE_VOICE;

const MALE_VOICES = new Set(["ash", "onyx", MALE_VOICE]);

/** Migriert beliebige gespeicherte Stimm-Werte auf die aktuelle Generation. */
export function normalizeVoice(value: unknown): VoiceName {
  return typeof value === "string" && MALE_VOICES.has(value)
    ? MALE_VOICE
    : FEMALE_VOICE;
}
