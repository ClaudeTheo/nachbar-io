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

/**
 * Sendet eine SMS an eine Telefonnummer via Twilio.
 * Gibt false zurueck wenn Twilio nicht konfiguriert ist (kein Fehler).
 */
export async function sendSms(payload: SmsPayload): Promise<boolean> {
  // Graceful Fallback wenn Twilio nicht konfiguriert
  if (!isTwilioConfigured()) {
    console.warn(
      `[care/sms] SMS nicht gesendet — Twilio nicht konfiguriert`,
      { phone: payload.phone.slice(0, 6) + '...', messageLength: payload.message.length }
    );
    return false;
  }

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
      { sid: result.sid, to: payload.phone.slice(0, 6) + '...', status: result.status }
    );

    return true;
  } catch (error) {
    console.error(
      `[care/sms] SMS-Versand fehlgeschlagen`,
      { phone: payload.phone.slice(0, 6) + '...', error: error instanceof Error ? error.message : error }
    );
    return false;
  }
}
