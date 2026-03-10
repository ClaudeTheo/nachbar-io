// lib/care/channels/voice.ts
// Anruf-Kanal — Stub fuer spaetere Twilio-Integration

interface VoicePayload {
  phone: string;
  ttsMessage: string;
}

/**
 * Initiiert einen Telefonanruf mit TTS-Nachricht.
 * STUB: Loggt die Nachricht, ruft aber noch nicht an.
 * Fuer Aktivierung: Twilio Voice SDK integrieren.
 */
export async function initiateCall(payload: VoicePayload): Promise<boolean> {
  console.warn(
    `[care/voice] STUB — Anruf nicht gestartet (Twilio nicht konfiguriert)`,
    { phone: payload.phone.slice(0, 6) + '...', messageLength: payload.ttsMessage.length }
  );

  // TODO: Twilio Voice Integration
  // const client = require('twilio')(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);
  // await client.calls.create({
  //   twiml: `<Response><Say language="de-DE">${payload.ttsMessage}</Say></Response>`,
  //   from: process.env.TWILIO_PHONE_NUMBER,
  //   to: payload.phone,
  // });

  return false;
}
