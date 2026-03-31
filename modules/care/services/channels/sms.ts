// lib/care/channels/sms.ts
// SMS-Kanal via Twilio — Sendet SMS an Telefonnummern
// Graceful Fallback wenn Twilio-Credentials fehlen

interface SmsPayload {
  phone: string;
  message: string;
}

// Twilio-Credentials aus Umgebungsvariablen
const TWILIO_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_FROM = process.env.TWILIO_PHONE_NUMBER;

/**
 * Pruefen ob Twilio konfiguriert ist.
 */
export function isTwilioConfigured(): boolean {
  return !!(
    TWILIO_SID && TWILIO_SID.startsWith('AC') &&
    TWILIO_AUTH_TOKEN && TWILIO_AUTH_TOKEN.length > 20 &&
    TWILIO_FROM
  );
}

/** Maximale Anzahl Versuche bei transientem Fehler */
const MAX_RETRIES = 3;

/** Wartezeit zwischen Versuchen in ms (exponentiell: 1s, 2s, 4s) */
function retryDelay(attempt: number): number {
  return Math.min(1000 * Math.pow(2, attempt), 4000);
}

/**
 * Sendet eine SMS an eine Telefonnummer via Twilio.
 * Gibt false zurueck wenn Twilio nicht konfiguriert ist (kein Fehler).
 * Bei transienten Fehlern werden bis zu 3 Versuche unternommen.
 */
export async function sendSms(payload: SmsPayload): Promise<boolean> {
  // Graceful Fallback wenn Twilio nicht konfiguriert
  if (!isTwilioConfigured()) {
    console.warn(
      `[care/sms] SMS nicht gesendet — Twilio nicht konfiguriert`,
      { phone: '***' + payload.phone.slice(-4), messageLength: payload.message.length }
    );
    return false;
  }

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      // Dynamischer Import damit Build nicht fehlschlaegt wenn Twilio nicht installiert
      const twilio = await import('twilio');
      const client = twilio.default(TWILIO_SID!, TWILIO_AUTH_TOKEN!);

      const result = await client.messages.create({
        body: payload.message,
        from: TWILIO_FROM!,
        to: payload.phone,
      });

      console.log(
        `[care/sms] SMS gesendet`,
        { sid: result.sid, to: '***' + payload.phone.slice(-4), status: result.status, attempt: attempt + 1 }
      );

      return true;
    } catch (error) {
      const isLastAttempt = attempt === MAX_RETRIES - 1;
      const errorMsg = error instanceof Error ? error.message : String(error);

      // Permanente Fehler nicht wiederholen (ungueltige Nummer, Auth-Fehler)
      const isPermanent = errorMsg.includes('is not a valid phone number')
        || errorMsg.includes('unverified')
        || errorMsg.includes('authenticate')
        || (error instanceof Error && 'status' in error && (error as { status: number }).status === 400);

      if (isPermanent || isLastAttempt) {
        console.error(
          `[care/sms] SMS-Versand endgueltig fehlgeschlagen`,
          { phone: '***' + payload.phone.slice(-4), error: errorMsg, attempts: attempt + 1 }
        );
        return false;
      }

      console.warn(
        `[care/sms] SMS-Versand fehlgeschlagen, Retry ${attempt + 1}/${MAX_RETRIES}`,
        { phone: '***' + payload.phone.slice(-4), error: errorMsg }
      );
      await new Promise(resolve => setTimeout(resolve, retryDelay(attempt)));
    }
  }

  return false;
}
