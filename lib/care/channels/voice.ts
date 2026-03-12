// lib/care/channels/voice.ts
// Anruf-Kanal via Twilio Voice — Automatische Sprachanrufe mit TTS
// Graceful Fallback wenn Twilio-Credentials fehlen

interface VoicePayload {
  phone: string;
  ttsMessage: string;
}

// Twilio-Credentials aus Umgebungsvariablen (gleiche wie SMS)
const TWILIO_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_FROM = process.env.TWILIO_PHONE_NUMBER;

/**
 * Pruefen ob Twilio konfiguriert ist.
 */
export function isTwilioVoiceConfigured(): boolean {
  return !!(TWILIO_SID && TWILIO_AUTH_TOKEN && TWILIO_FROM);
}

/**
 * Erstellt TwiML fuer eine Sprachansage.
 * Nutzt <Say> mit deutscher Sprache und Polly-Stimme.
 * Wiederholt die Nachricht einmal fuer besseres Verstaendnis.
 */
function buildTwiml(message: string): string {
  // XML-Sonderzeichen escapen
  const escaped = message
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<Response>',
    `  <Say language="de-DE" voice="Polly.Vicki">${escaped}</Say>`,
    '  <Pause length="2"/>',
    `  <Say language="de-DE" voice="Polly.Vicki">Ich wiederhole: ${escaped}</Say>`,
    '  <Pause length="1"/>',
    '  <Say language="de-DE" voice="Polly.Vicki">Auf Wiederhören.</Say>',
    '</Response>',
  ].join('\n');
}

/**
 * Initiiert einen Telefonanruf mit TTS-Nachricht via Twilio.
 * Gibt false zurueck wenn Twilio nicht konfiguriert ist (kein Fehler).
 */
export async function initiateCall(payload: VoicePayload): Promise<boolean> {
  // Graceful Fallback wenn Twilio nicht konfiguriert
  if (!isTwilioVoiceConfigured()) {
    console.warn(
      `[care/voice] Anruf nicht gestartet — Twilio nicht konfiguriert`,
      { phone: payload.phone.slice(0, 6) + '...', messageLength: payload.ttsMessage.length }
    );
    return false;
  }

  try {
    const twilio = await import('twilio');
    const client = twilio.default(TWILIO_SID!, TWILIO_AUTH_TOKEN!);

    const twiml = buildTwiml(payload.ttsMessage);

    const call = await client.calls.create({
      twiml,
      from: TWILIO_FROM!,
      to: payload.phone,
      // Anruf nach 2 Minuten automatisch beenden (Sicherheit)
      timeout: 30,
      // Machine-Detection: Bei Anrufbeantworter trotzdem die Nachricht hinterlassen
      machineDetection: 'Enable' as const,
    });

    console.log(
      `[care/voice] Anruf gestartet`,
      { sid: call.sid, to: payload.phone.slice(0, 6) + '...', status: call.status }
    );

    return true;
  } catch (error) {
    console.error(
      `[care/voice] Anruf fehlgeschlagen`,
      { phone: payload.phone.slice(0, 6) + '...', error: error instanceof Error ? error.message : error }
    );
    return false;
  }
}
