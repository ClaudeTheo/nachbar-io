// lib/webhooks.ts
// Nachbar.io — Webhook-Utilities fuer Pro Community Organisationen
// HMAC-SHA256 Signaturen und Webhook-Versand

import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Erstellt eine HMAC-SHA256 Signatur fuer den Webhook-Payload.
 * Wird als X-Webhook-Signature Header mitgeschickt.
 */
export function signWebhookPayload(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('hex');
}

/**
 * Prueft ob eine Webhook-Signatur gueltig ist (timing-safe Vergleich).
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expected = signWebhookPayload(payload, secret);

  // Timing-safe Vergleich gegen Timing-Attacken
  if (expected.length !== signature.length) return false;

  try {
    return timingSafeEqual(
      Buffer.from(expected, 'hex'),
      Buffer.from(signature, 'hex')
    );
  } catch {
    return false;
  }
}

/**
 * Validiert ob die URL HTTPS verwendet (Pflicht fuer Webhooks).
 */
export function isValidWebhookUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Sendet einen Webhook-Event an die konfigurierte URL.
 * Signiert den Payload mit HMAC-SHA256 und sendet ihn als POST.
 *
 * @returns true bei Erfolg (2xx), false bei Fehler
 */
export async function sendWebhook(
  url: string,
  event: string,
  data: unknown,
  secret: string
): Promise<boolean> {
  // URL-Validierung: nur HTTPS erlaubt
  if (!isValidWebhookUrl(url)) {
    console.error('[webhooks] URL muss HTTPS verwenden:', url);
    return false;
  }

  const payload = JSON.stringify({
    event,
    data,
    timestamp: new Date().toISOString(),
  });

  const signature = signWebhookPayload(payload, secret);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': signature,
        'X-Webhook-Event': event,
      },
      body: payload,
      signal: AbortSignal.timeout(10_000), // 10s Timeout
    });

    if (!response.ok) {
      console.error(
        `[webhooks] Fehler bei ${url}: ${response.status} ${response.statusText}`
      );
      return false;
    }

    return true;
  } catch (error) {
    console.error('[webhooks] Netzwerkfehler:', error);
    return false;
  }
}
