// lib/care/channels/sms.ts
// SMS-Kanal — Stub fuer spaetere Twilio-Integration

interface SmsPayload {
  phone: string;
  message: string;
}

/**
 * Sendet eine SMS an eine Telefonnummer.
 * STUB: Loggt die Nachricht, sendet aber noch nicht.
 * Fuer Aktivierung: Twilio SDK integrieren.
 */
export async function sendSms(payload: SmsPayload): Promise<boolean> {
  console.warn(
    `[care/sms] STUB — SMS nicht gesendet (Twilio nicht konfiguriert)`,
    { phone: payload.phone.slice(0, 6) + '...', messageLength: payload.message.length }
  );

  // TODO: Twilio-Integration
  // const client = require('twilio')(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);
  // await client.messages.create({
  //   body: payload.message,
  //   from: process.env.TWILIO_PHONE_NUMBER,
  //   to: payload.phone,
  // });

  return false;
}
