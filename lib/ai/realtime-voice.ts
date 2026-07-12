const DEFAULT_REALTIME_MODEL = "gpt-realtime-mini";
const DEFAULT_MAX_SESSION_MINUTES = 10;

export function isRealtimeVoiceEnabled(): boolean {
  return (
    Boolean(process.env.OPENAI_API_KEY?.trim()) &&
    process.env.REALTIME_VOICE_ENABLED === "1"
  );
}

export function getRealtimeVoiceModel(): string {
  return (
    process.env.REALTIME_VOICE_MODEL?.trim() || DEFAULT_REALTIME_MODEL
  );
}

export function getRealtimeVoiceMaxSessionSeconds(): number {
  const configured = Number(process.env.REALTIME_VOICE_MAX_MINUTES);
  const minutes =
    Number.isFinite(configured) && configured >= 1 && configured <= 10
      ? configured
      : DEFAULT_MAX_SESSION_MINUTES;
  return Math.round(minutes * 60);
}
