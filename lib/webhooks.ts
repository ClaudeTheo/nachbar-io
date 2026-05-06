// lib/webhooks.ts
// Nachbar.io — Webhook-Utilities fuer Pro Community Organisationen
// HMAC-SHA256 Signaturen und Webhook-Versand

import { createHmac, timingSafeEqual } from 'crypto';
import { isIP } from 'net';

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

// Private IP-Bereiche die fuer externe Webhook-/Connector-URLs blockiert werden (SSRF-Schutz)
const BLOCKED_HOSTNAMES = ['localhost'];

/**
 * Validiert ob die URL HTTPS verwendet und keine internen IPs adressiert.
 * Schuetzt gegen SSRF-Angriffe ueber externe URLs.
 */
export function isValidExternalUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') return false;

    const hostname = parsed.hostname.toLowerCase();

    if (isBlockedHostname(hostname)) return false;

    return true;
  } catch {
    return false;
  }
}

function isBlockedHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase();
  const unbracketed = normalized.replace(/^\[(.*)\]$/, '$1');

  if (BLOCKED_HOSTNAMES.includes(unbracketed)) return true;

  if (isIP(unbracketed) === 4) {
    return isBlockedIpv4(unbracketed);
  }

  if (isIP(unbracketed) === 6) {
    return isBlockedIpv6(unbracketed);
  }

  // Numerische Hosts werden von URL bereits normalisiert; bleibt als Fail-Closed-Guard.
  return /^\d+$/.test(unbracketed);
}

function isBlockedIpv4(hostname: string): boolean {
  const octets = hostname.split('.').map((part) => Number(part));
  if (
    octets.length !== 4 ||
    octets.some((part) => !Number.isInteger(part) || part < 0 || part > 255)
  ) {
    return true;
  }

  const [first, second] = octets;

  return (
    first === 0 ||
    first === 10 ||
    first === 127 ||
    first === 169 && second === 254 ||
    first === 172 && second >= 16 && second <= 31 ||
    first === 192 && second === 168 ||
    first === 100 && second >= 64 && second <= 127
  );
}

function isBlockedIpv6(hostname: string): boolean {
  if (hostname === '::' || hostname === '::1') return true;
  if (hostname.startsWith('fc') || hostname.startsWith('fd')) return true;
  if (hostname.startsWith('fe80:')) return true;

  const mappedIpv4 = ipv4FromMappedIpv6(hostname);
  return mappedIpv4 ? isBlockedIpv4(mappedIpv4) : false;
}

function ipv4FromMappedIpv6(hostname: string): string | null {
  if (!hostname.startsWith('::ffff:')) return null;

  const tail = hostname.slice('::ffff:'.length);
  if (tail.includes('.')) return tail;

  const parts = tail.split(':');
  if (parts.length !== 2) return null;

  const high = Number.parseInt(parts[0], 16);
  const low = Number.parseInt(parts[1], 16);
  if (
    !Number.isInteger(high) ||
    !Number.isInteger(low) ||
    high < 0 ||
    high > 0xffff ||
    low < 0 ||
    low > 0xffff
  ) {
    return null;
  }

  return [
    (high >> 8) & 0xff,
    high & 0xff,
    (low >> 8) & 0xff,
    low & 0xff,
  ].join('.');
}

/**
 * Backwards-compatible Alias fuer bestehende Webhook-Aufrufer.
 */
export function isValidWebhookUrl(url: string): boolean {
  return isValidExternalUrl(url);
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
