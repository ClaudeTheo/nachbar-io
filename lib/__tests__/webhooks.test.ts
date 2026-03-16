// lib/__tests__/webhooks.test.ts
// Unit-Tests fuer Webhook-Utilities (HMAC-SHA256 Signaturen)

import { describe, it, expect } from 'vitest';
import { createHmac } from 'crypto';
import {
  signWebhookPayload,
  verifyWebhookSignature,
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
