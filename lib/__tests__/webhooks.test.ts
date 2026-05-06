// lib/__tests__/webhooks.test.ts
// Unit-Tests fuer Webhook-Utilities (HMAC-SHA256 Signaturen)

import { describe, it, expect } from 'vitest';
import { createHmac } from 'crypto';
import {
  signWebhookPayload,
  verifyWebhookSignature,
  isValidExternalUrl,
  isValidWebhookUrl,
} from '../webhooks';

describe('signWebhookPayload', () => {
  it('erstellt eine gueltige HMAC-SHA256 Signatur', () => {
    const payload = '{"event":"test","data":{}}';
    const secret = 'test-secret-key';

    const signature = signWebhookPayload(payload, secret);

    // Manuell berechnen zum Vergleich
    const expected = createHmac('sha256', secret).update(payload).digest('hex');
    expect(signature).toBe(expected);
  });

  it('erzeugt unterschiedliche Signaturen fuer unterschiedliche Payloads', () => {
    const secret = 'test-secret';
    const sig1 = signWebhookPayload('payload-1', secret);
    const sig2 = signWebhookPayload('payload-2', secret);

    expect(sig1).not.toBe(sig2);
  });

  it('erzeugt unterschiedliche Signaturen fuer unterschiedliche Secrets', () => {
    const payload = 'same-payload';
    const sig1 = signWebhookPayload(payload, 'secret-1');
    const sig2 = signWebhookPayload(payload, 'secret-2');

    expect(sig1).not.toBe(sig2);
  });
});

describe('verifyWebhookSignature', () => {
  const payload = '{"event":"checkin.created","data":{"user_id":"abc123"}}';
  const secret = 'webhook-secret-2026';

  it('gibt true zurueck fuer gueltige Signatur', () => {
    const signature = signWebhookPayload(payload, secret);
    expect(verifyWebhookSignature(payload, signature, secret)).toBe(true);
  });

  it('gibt false zurueck fuer manipulierten Payload', () => {
    const signature = signWebhookPayload(payload, secret);
    const tamperedPayload = payload.replace('abc123', 'hacked');
    expect(verifyWebhookSignature(tamperedPayload, signature, secret)).toBe(false);
  });

  it('gibt false zurueck fuer falsches Secret', () => {
    const signature = signWebhookPayload(payload, secret);
    expect(verifyWebhookSignature(payload, signature, 'wrong-secret')).toBe(false);
  });

  it('gibt false zurueck fuer komplett ungueltige Signatur', () => {
    expect(verifyWebhookSignature(payload, 'not-a-valid-hex', secret)).toBe(false);
  });
});

describe('isValidWebhookUrl', () => {
  it('akzeptiert HTTPS URLs', () => {
    expect(isValidWebhookUrl('https://example.com/webhook')).toBe(true);
    expect(isValidWebhookUrl('https://api.nachbar.io/hooks/org123')).toBe(true);
  });

  it('lehnt HTTP URLs ab', () => {
    expect(isValidWebhookUrl('http://example.com/webhook')).toBe(false);
  });

  it('lehnt ungueltige URLs ab', () => {
    expect(isValidWebhookUrl('not-a-url')).toBe(false);
    expect(isValidWebhookUrl('')).toBe(false);
  });

  it('lehnt andere Protokolle ab', () => {
    expect(isValidWebhookUrl('ftp://example.com/webhook')).toBe(false);
  });
});

describe('isValidExternalUrl', () => {
  it('akzeptiert externe HTTPS URLs', () => {
    expect(isValidExternalUrl('https://example.com/calendar.ics')).toBe(true);
    expect(isValidExternalUrl('https://awb.example.org/feed?id=42')).toBe(true);
  });

  it('lehnt private und lokale Ziele ab', () => {
    expect(isValidExternalUrl('https://localhost/calendar.ics')).toBe(false);
    expect(isValidExternalUrl('https://127.0.0.1/calendar.ics')).toBe(false);
    expect(isValidExternalUrl('https://[::1]/calendar.ics')).toBe(false);
    expect(isValidExternalUrl('https://[::ffff:127.0.0.1]/calendar.ics')).toBe(false);
    expect(isValidExternalUrl('https://10.0.0.5/calendar.ics')).toBe(false);
    expect(isValidExternalUrl('https://172.16.1.2/calendar.ics')).toBe(false);
    expect(isValidExternalUrl('https://192.168.1.10/calendar.ics')).toBe(false);
    expect(isValidExternalUrl('https://169.254.169.254/latest/meta-data')).toBe(false);
  });

  it('lehnt HTTP, numerische Hosts und ungueltige URLs ab', () => {
    expect(isValidExternalUrl('http://example.com/calendar.ics')).toBe(false);
    expect(isValidExternalUrl('https://2130706433/calendar.ics')).toBe(false);
    expect(isValidExternalUrl('https://0/calendar.ics')).toBe(false);
    expect(isValidExternalUrl('not-a-url')).toBe(false);
  });

  it('lehnt alternative IPv4-Notation fuer lokale und private Ziele ab', () => {
    expect(isValidExternalUrl('https://0x7f000001/calendar.ics')).toBe(false);
    expect(isValidExternalUrl('https://017700000001/calendar.ics')).toBe(false);
    expect(isValidExternalUrl('https://127.1/calendar.ics')).toBe(false);
    expect(isValidExternalUrl('https://192.168.1/calendar.ics')).toBe(false);
    expect(isValidExternalUrl('https://0x0a000001/calendar.ics')).toBe(false);
  });
});
