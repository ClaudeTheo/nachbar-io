// __tests__/api/cron/cron-idempotency.test.ts
// Block E.15: Cron-Idempotenz — zweimaliges Ausfuehren = gleicher Zustand

import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- Mocks fuer subscription-check ---
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
});

describe('Subscription-Check Cron Idempotenz', () => {
  it('erster Lauf: 2 Trials expired → 2 Downgrades', async () => {
    mockCheckTrialExpiry.mockResolvedValue({
      expired: ['user-1', 'user-2'],
      warned: [],
    });
    mockDowngradeToFree.mockResolvedValue(undefined);

    const { GET } = await import('@/app/api/cron/subscription-check/route');
    const req = new Request('http://localhost/api/cron/subscription-check', {
      headers: { authorization: `Bearer ${CRON_SECRET}` },
    });
    const res = await GET(req as never);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.downgraded).toBe(2);
    expect(mockDowngradeToFree).toHaveBeenCalledTimes(2);
    expect(mockSafeInsertNotification).toHaveBeenCalledTimes(2);
    expect(mockSendPush).toHaveBeenCalledTimes(2);
  });

  it('zweiter Lauf (gleiche Daten bereits verarbeitet): 0 Downgrades', async () => {
    // Nach dem ersten Lauf sind die Trials bereits downgraded
    // checkTrialExpiry gibt jetzt leere Listen zurueck
    vi.resetModules();
    mockCheckTrialExpiry.mockResolvedValue({ expired: [], warned: [] });
    mockDowngradeToFree.mockClear();
    mockSafeInsertNotification.mockClear();
    mockSendPush.mockClear();

    const { GET } = await import('@/app/api/cron/subscription-check/route');
    const req = new Request('http://localhost/api/cron/subscription-check', {
      headers: { authorization: `Bearer ${CRON_SECRET}` },
    });
    const res = await GET(req as never);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.downgraded).toBe(0);
    expect(json.warnings).toBe(0);
    // KERN: Keine Downgrades, keine Notifications — idempotent
    expect(mockDowngradeToFree).not.toHaveBeenCalled();
    expect(mockSafeInsertNotification).not.toHaveBeenCalled();
    expect(mockSendPush).not.toHaveBeenCalled();
  });

  it('partieller Fehler: erfolgreiche Downgrades zaehlen, Fehler auch', async () => {
    mockCheckTrialExpiry.mockResolvedValue({
      expired: ['user-1', 'user-2', 'user-3'],
      warned: ['user-4'],
    });
    // user-1 OK, user-2 Fehler, user-3 OK
    mockDowngradeToFree
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('DB-Fehler'))
      .mockResolvedValueOnce(undefined);

    const { GET } = await import('@/app/api/cron/subscription-check/route');
    const req = new Request('http://localhost/api/cron/subscription-check', {
      headers: { authorization: `Bearer ${CRON_SECRET}` },
    });
    const res = await GET(req as never);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.downgraded).toBe(2); // 2 erfolgreich
    expect(json.errors).toBe(1);    // 1 fehlgeschlagen
    expect(json.warnings).toBe(1);  // 1 Warnung
    // Cron-Heartbeat MUSS trotzdem geschrieben werden
    expect(mockWriteCronHeartbeat).toHaveBeenCalledOnce();
  });

  it('Cron-Heartbeat dokumentiert Ergebnis vollstaendig', async () => {
    mockCheckTrialExpiry.mockResolvedValue({ expired: ['user-1'], warned: ['user-2'] });
    mockDowngradeToFree.mockResolvedValue(undefined);

    const { GET } = await import('@/app/api/cron/subscription-check/route');
    const req = new Request('http://localhost/api/cron/subscription-check', {
      headers: { authorization: `Bearer ${CRON_SECRET}` },
    });
    await GET(req as never);

    expect(mockWriteCronHeartbeat).toHaveBeenCalledWith(
      expect.anything(),
      'subscription_check',
      expect.objectContaining({
        downgraded: 1,
        warnings: 1,
        errors: 0,
      }),
    );
  });
});

// --- Heartbeat-Cleanup Idempotenz ---
describe('Heartbeat-Cleanup Cron Idempotenz', () => {
  const mockDelete = vi.fn();
  const mockLt = vi.fn();
  const mockSelect = vi.fn();

  beforeEach(() => {
    vi.resetModules();
    mockDelete.mockClear();
    mockLt.mockClear();
    mockSelect.mockClear();

    vi.doMock('@supabase/supabase-js', () => ({
      createClient: vi.fn(() => ({
        from: vi.fn(() => ({
          delete: mockDelete.mockReturnValue({
            lt: mockLt.mockReturnValue({
              select: mockSelect,
            }),
          }),
        })),
      })),
    }));

    vi.doMock('@/lib/care/constants', () => ({
      HEARTBEAT_RETENTION_DAYS: 90,
    }));
  });

  it('erster Lauf loescht 5 alte Heartbeats', async () => {
    mockSelect.mockResolvedValue({
      data: Array.from({ length: 5 }, (_, i) => ({ id: `hb-${i}` })),
      error: null,
    });

    const { GET } = await import('@/app/api/cron/heartbeat-cleanup/route');
    const req = new Request('http://localhost/api/cron/heartbeat-cleanup', {
      headers: { authorization: `Bearer ${CRON_SECRET}` },
    });
    const res = await GET(req as never);
    const json = await res.json();

    expect(json.deleted).toBe(5);
  });

  it('zweiter Lauf: keine alten Heartbeats mehr → 0 geloescht', async () => {
    vi.resetModules();
    mockSelect.mockResolvedValue({ data: [], error: null });

    vi.doMock('@supabase/supabase-js', () => ({
      createClient: vi.fn(() => ({
        from: vi.fn(() => ({
          delete: mockDelete.mockReturnValue({
            lt: mockLt.mockReturnValue({ select: mockSelect }),
          }),
        })),
      })),
    }));

    vi.doMock('@/lib/care/constants', () => ({
      HEARTBEAT_RETENTION_DAYS: 90,
    }));

    const { GET } = await import('@/app/api/cron/heartbeat-cleanup/route');
    const req = new Request('http://localhost/api/cron/heartbeat-cleanup', {
      headers: { authorization: `Bearer ${CRON_SECRET}` },
    });
    const res = await GET(req as never);
    const json = await res.json();

    expect(json.deleted).toBe(0);
  });
});
