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
  return !!(
    TWILIO_SID && TWILIO_SID.startsWith('AC') &&
    TWILIO_AUTH_TOKEN && TWILIO_AUTH_TOKEN.length > 20 &&
    TWILIO_FROM
  );
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

/** Maximale Anzahl Versuche bei transientem Fehler */
const MAX_RETRIES = 3;

/** Wartezeit zwischen Versuchen in ms (exponentiell: 1s, 2s, 4s) */
function retryDelay(attempt: number): number {
  return Math.min(1000 * Math.pow(2, attempt), 4000);
}

/**
 * Initiiert einen Telefonanruf mit TTS-Nachricht via Twilio.
 * Gibt false zurueck wenn Twilio nicht konfiguriert ist (kein Fehler).
 * Bei transienten Fehlern werden bis zu 3 Versuche unternommen.
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

  const twiml = buildTwiml(payload.ttsMessage);

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const twilio = await import('twilio');
      const client = twilio.default(TWILIO_SID!, TWILIO_AUTH_TOKEN!);

      const call = await client.calls.create({
        twiml,
        from: TWILIO_FROM!,
        to: payload.phone,
        // Anruf nach 30 Sekunden automatisch beenden (Sicherheit)
        timeout: 30,
        // Machine-Detection: Bei Anrufbeantworter trotzdem die Nachricht hinterlassen
        machineDetection: 'Enable' as const,
      });

      console.log(
        `[care/voice] Anruf gestartet`,
        { sid: call.sid, to: payload.phone.slice(0, 6) + '...', status: call.status, attempt: attempt + 1 }
      );

      return true;
    } catch (error) {
      const isLastAttempt = attempt === MAX_RETRIES - 1;
      const errorMsg = error instanceof Error ? error.message : String(error);

      // Permanente Fehler nicht wiederholen
      const isPermanent = errorMsg.includes('is not a valid phone number')
        || errorMsg.includes('unverified')
        || errorMsg.includes('authenticate')
        || (error instanceof Error && 'status' in error && (error as { status: number }).status === 400);

      if (isPermanent || isLastAttempt) {
        console.error(
          `[care/voice] Anruf endgueltig fehlgeschlagen`,
          { phone: payload.phone.slice(0, 6) + '...', error: errorMsg, attempts: attempt + 1 }
        );
        return false;
      }

      console.warn(
        `[care/voice] Anruf fehlgeschlagen, Retry ${attempt + 1}/${MAX_RETRIES}`,
        { phone: payload.phone.slice(0, 6) + '...', error: errorMsg }
      );
      await new Promise(resolve => setTimeout(resolve, retryDelay(attempt)));
    }
  }

  return false;
}
