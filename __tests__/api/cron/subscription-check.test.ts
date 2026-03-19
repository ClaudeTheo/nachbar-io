// __tests__/api/cron/subscription-check.test.ts
// Tests fuer Cron: Trial-Ablauf pruefen + Auto-Downgrade

import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- Mocks ---
const mockCheckTrialExpiry = vi.fn();
const mockDowngradeToFree = vi.fn();
const mockSendPush = vi.fn();
const mockWriteCronHeartbeat = vi.fn();
const mockSafeInsertNotification = vi.fn();

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({})),
}));

vi.mock('@/lib/subscription', () => ({
  checkTrialExpiry: (...args: unknown[]) => mockCheckTrialExpiry(...args),
  downgradeToFree: (...args: unknown[]) => mockDowngradeToFree(...args),
}));

vi.mock('@/lib/care/channels/push', () => ({
  sendPush: (...args: unknown[]) => mockSendPush(...args),
}));

vi.mock('@/lib/care/cron-heartbeat', () => ({
  writeCronHeartbeat: (...args: unknown[]) => mockWriteCronHeartbeat(...args),
}));

vi.mock('@/lib/notifications-server', () => ({
  safeInsertNotification: (...args: unknown[]) => mockSafeInsertNotification(...args),
}));

const CRON_SECRET = 'test-cron-secret';

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('CRON_SECRET', CRON_SECRET);
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co');
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-key');

  mockCheckTrialExpiry.mockResolvedValue({ expired: [], warned: [] });
  mockDowngradeToFree.mockResolvedValue(undefined);
  mockSendPush.mockResolvedValue(undefined);
  mockWriteCronHeartbeat.mockResolvedValue(undefined);
  mockSafeInsertNotification.mockResolvedValue(undefined);
});

describe('GET /api/cron/subscription-check', () => {
  it('verarbeitet abgelaufene Trials und sendet Warnungen', async () => {
    mockCheckTrialExpiry.mockResolvedValue({
      expired: ['user-1'],
      warned: ['user-2'],
    });

    const { GET } = await import('@/app/api/cron/subscription-check/route');
    const request = new Request('http://localhost/api/cron/subscription-check', {
      headers: { authorization: `Bearer ${CRON_SECRET}` },
    });
    const response = await GET(request as never);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.downgraded).toBe(1);
    expect(json.warnings).toBe(1);
    expect(mockDowngradeToFree).toHaveBeenCalledOnce();
    expect(mockSafeInsertNotification).toHaveBeenCalledTimes(2);
    expect(mockSendPush).toHaveBeenCalledTimes(2);
    expect(mockWriteCronHeartbeat).toHaveBeenCalledOnce();
  });

  it('verarbeitet leere Listen ohne Fehler', async () => {
    const { GET } = await import('@/app/api/cron/subscription-check/route');
    const request = new Request('http://localhost/api/cron/subscription-check', {
      headers: { authorization: `Bearer ${CRON_SECRET}` },
    });
    const response = await GET(request as never);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.downgraded).toBe(0);
    expect(json.warnings).toBe(0);
  });

  it('gibt 401 ohne korrekte Authentifizierung', async () => {
    const { GET } = await import('@/app/api/cron/subscription-check/route');
    const request = new Request('http://localhost/api/cron/subscription-check', {
      headers: { authorization: 'Bearer wrong' },
    });
    const response = await GET(request as never);

    expect(response.status).toBe(401);
  });

  it('zaehlt Fehler bei einzelnen Downgrades', async () => {
    mockCheckTrialExpiry.mockResolvedValue({
      expired: ['user-1', 'user-2'],
      warned: [],
    });
    // Erster Downgrade gelingt, zweiter schlaegt fehl
    mockDowngradeToFree
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('DB error'));

    const { GET } = await import('@/app/api/cron/subscription-check/route');
    const request = new Request('http://localhost/api/cron/subscription-check', {
      headers: { authorization: `Bearer ${CRON_SECRET}` },
    });
    const response = await GET(request as never);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.downgraded).toBe(1);
    expect(json.errors).toBe(1);
  });
});
