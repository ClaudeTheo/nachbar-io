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

// Private IP-Bereiche die fuer Webhooks blockiert werden (SSRF-Schutz)
const BLOCKED_HOSTNAMES = ['localhost', '127.0.0.1', '[::1]', '0.0.0.0'];
const BLOCKED_IP_PREFIXES = [
  '10.',          // 10.0.0.0/8
  '172.16.', '172.17.', '172.18.', '172.19.', '172.20.', '172.21.',
  '172.22.', '172.23.', '172.24.', '172.25.', '172.26.', '172.27.',
  '172.28.', '172.29.', '172.30.', '172.31.',  // 172.16.0.0/12
  '192.168.',     // 192.168.0.0/16
  '169.254.',     // 169.254.0.0/16 (Link-Local, AWS Metadata)
  'fd',           // fc00::/7 IPv6 ULA
  'fe80:',        // Link-Local IPv6
];

/**
 * Validiert ob die URL HTTPS verwendet und keine internen IPs adressiert.
 * Schuetzt gegen SSRF-Angriffe ueber Webhook-URLs.
 */
export function isValidWebhookUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') return false;

    const hostname = parsed.hostname.toLowerCase();

    // Blockierte Hostnamen (localhost, loopback)
    if (BLOCKED_HOSTNAMES.includes(hostname)) return false;

    // Blockierte IP-Bereiche (Private, Link-Local, Metadata)
    for (const prefix of BLOCKED_IP_PREFIXES) {
      if (hostname.startsWith(prefix)) return false;
    }

    // Numerische IPv4 blockieren (z.B. 2130706433 = 127.0.0.1)
    if (/^\d+$/.test(hostname)) return false;

    return true;
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
