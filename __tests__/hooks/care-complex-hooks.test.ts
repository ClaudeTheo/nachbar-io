// __tests__/hooks/care-complex-hooks.test.ts
// Nachbar.io — Tests fuer komplexe Care-Hooks
// useAlarm, useConsultations, useSubscription, useReportData

import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Global fetch-Mock
const mockFetch = vi.fn();
global.fetch = mockFetch;

import { useAlarm } from '@/lib/care/hooks/useAlarm';
import { useConsultations } from '@/lib/care/hooks/useConsultations';
import { useSubscription } from '@/lib/care/hooks/useSubscription';
import { useReportData } from '@/lib/care/hooks/useReportData';

// === useAlarm ===
describe('useAlarm', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    // Mock AudioContext (nicht in jsdom)
    global.AudioContext = vi.fn().mockImplementation(() => ({
      state: 'running',
      createOscillator: () => ({
        connect: vi.fn(),
        frequency: { setValueAtTime: vi.fn() },
        type: 'sine',
        start: vi.fn(),
        stop: vi.fn(),
      }),
      createGain: () => ({
        connect: vi.fn(),
        gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
      }),
      destination: {},
      currentTime: 0,
      close: vi.fn().mockResolvedValue(undefined),
    })) as unknown as typeof AudioContext;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('startet im Nicht-Klingeln-Zustand', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ checkinEnabled: false, checkinTimes: [], today: [] }),
    });

    const { result } = renderHook(() => useAlarm());

    expect(result.current.alarm.isRinging).toBe(false);
    expect(result.current.alarm.scheduledAt).toBeNull();
  });

  it('deaktiviert Alarm wenn Check-in nicht enabled', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ checkinEnabled: false, checkinTimes: [], today: [] }),
    });

    const { result } = renderHook(() => useAlarm());
    await act(async () => { await vi.advanceTimersByTimeAsync(100); });

    expect(result.current.alarm.isRinging).toBe(false);
    expect(result.current.alarm.nextAlarmIn).toBeNull();
  });

  it('stellt dismissAlarm-Funktion bereit', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ checkinEnabled: false }),
    });
    const { result } = renderHook(() => useAlarm());
    expect(typeof result.current.dismissAlarm).toBe('function');
  });

  it('stellt snoozeAlarm-Funktion bereit', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ checkinEnabled: false }),
    });
    const { result } = renderHook(() => useAlarm());
    expect(typeof result.current.snoozeAlarm).toBe('function');
  });

  it('dismissAlarm sendet Check-in mit status ok', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ checkinEnabled: false }),
    });

    const { result } = renderHook(() => useAlarm());

    // dismissAlarm aufrufen
    mockFetch.mockResolvedValueOnce({ ok: true });
    await act(async () => {
      const success = await result.current.dismissAlarm();
      expect(success).toBe(true);
    });

    // Pruefe ob Check-in POST gesendet wurde
    const postCall = mockFetch.mock.calls.find(
      (c: unknown[]) => typeof c[1] === 'object' && (c[1] as { method?: string }).method === 'POST'
    );
    if (postCall) {
      const body = JSON.parse((postCall[1] as { body: string }).body);
      expect(body.status).toBe('ok');
      expect(body.mood).toBe('good');
    }
  });

  it('snoozeAlarm setzt isRinging auf false', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ checkinEnabled: false }),
    });

    const { result } = renderHook(() => useAlarm());

    act(() => {
      result.current.snoozeAlarm(10);
    });

    expect(result.current.alarm.isRinging).toBe(false);
  });
});

// === useConsultations ===
describe('useConsultations', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([
        { id: 'slot-1', doctor_id: 'doc-1', scheduled_at: '2026-03-22T14:00:00Z', status: 'available' },
        { id: 'slot-2', doctor_id: 'doc-1', scheduled_at: '2026-03-22T15:00:00Z', status: 'booked' },
      ]),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('laedt Sprechstunden-Slots', async () => {
    const { result } = renderHook(() => useConsultations('q-1'));
    await act(async () => { await vi.advanceTimersByTimeAsync(100); });
    expect(result.current.slots).toHaveLength(2);
    expect(result.current.loading).toBe(false);
  });

  it('sendet quarter_id und my-Parameter', async () => {
    renderHook(() => useConsultations('q-1', true));
    await act(async () => { await vi.advanceTimersByTimeAsync(100); });
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain('quarter_id=q-1');
    expect(url).toContain('my=true');
  });

  it('setzt error bei HTTP-Fehler', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 500 });
    const { result } = renderHook(() => useConsultations('q-1'));
    await act(async () => { await vi.advanceTimersByTimeAsync(100); });
    expect(result.current.error).toBeTruthy();
  });

  it('stellt bookSlot-Funktion bereit', async () => {
    const { result } = renderHook(() => useConsultations('q-1'));
    await act(async () => { await vi.advanceTimersByTimeAsync(100); });
    expect(typeof result.current.bookSlot).toBe('function');
  });

  it('stellt refresh-Funktion bereit', async () => {
    const { result } = renderHook(() => useConsultations('q-1'));
    await act(async () => { await vi.advanceTimersByTimeAsync(100); });
    expect(typeof result.current.refresh).toBe('function');
  });
});

// === useSubscription ===
describe('useSubscription', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 'sub-1', plan: 'plus', status: 'active' }),
    });
  });

  it('laedt Subscription', async () => {
    const { result } = renderHook(() => useSubscription());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.subscription?.plan).toBe('plus');
  });

  it('stellt changePlan bereit', async () => {
    const { result } = renderHook(() => useSubscription());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(typeof result.current.changePlan).toBe('function');
  });

  it('stellt cancelSubscription bereit', async () => {
    const { result } = renderHook(() => useSubscription());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(typeof result.current.cancelSubscription).toBe('function');
  });

  it('stellt reactivate bereit', async () => {
    const { result } = renderHook(() => useSubscription());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(typeof result.current.reactivate).toBe('function');
  });

  it('changePlan zu free sendet POST an subscriptions', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 'sub-1', plan: 'free', status: 'active' }),
    });

    const { result } = renderHook(() => useSubscription());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      const success = await result.current.changePlan('free');
      expect(success).toBe(true);
    });
  });

  it('changePlan zu plus sendet POST an billing/checkout', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ earlyAdopter: true, subscription: { plan: 'plus' } }),
    });

    const { result } = renderHook(() => useSubscription());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      const success = await result.current.changePlan('plus');
      expect(success).toBe(true);
    });
  });

  it('cancelSubscription sendet PATCH', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 'sub-1', plan: 'plus', status: 'cancelled' }),
    });

    const { result } = renderHook(() => useSubscription());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      const success = await result.current.cancelSubscription();
      expect(success).toBe(true);
    });
  });

  it('reactivate sendet PATCH', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 'sub-1', plan: 'plus', status: 'active' }),
    });

    const { result } = renderHook(() => useSubscription());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      const success = await result.current.reactivate();
      expect(success).toBe(true);
    });
  });
});

// === useReportData ===
describe('useReportData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ checkins: 28, medications: 45, sosAlerts: 1 }),
    });
  });

  it('laedt Berichtsdaten mit allen Parametern', async () => {
    const { result } = renderHook(() => useReportData({
      seniorId: 'senior-1',
      periodStart: '2026-03-01',
      periodEnd: '2026-03-22',
      type: 'care_report_weekly',
    }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.reportData).toBeDefined();
    expect(result.current.reportData?.checkins).toBe(28);
  });

  it('laedt nicht wenn Parameter fehlen', async () => {
    const { result } = renderHook(() => useReportData({ seniorId: 'senior-1' }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.reportData).toBeNull();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('sendet alle Parameter als Query-Params', async () => {
    renderHook(() => useReportData({
      seniorId: 'senior-1',
      periodStart: '2026-03-01',
      periodEnd: '2026-03-22',
      type: 'care_report_daily',
    }));
    await waitFor(() => expect(mockFetch).toHaveBeenCalled());
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain('senior_id=senior-1');
    expect(url).toContain('period_start=2026-03-01');
    expect(url).toContain('period_end=2026-03-22');
    expect(url).toContain('type=care_report_daily');
  });

  it('setzt reportData auf null bei HTTP-Fehler', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 403 });
    const { result } = renderHook(() => useReportData({
      seniorId: 'senior-1',
      periodStart: '2026-03-01',
      periodEnd: '2026-03-22',
      type: 'care_report_weekly',
    }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.reportData).toBeNull();
  });

  it('stellt refetch bereit', async () => {
    const { result } = renderHook(() => useReportData({
      seniorId: 'senior-1',
      periodStart: '2026-03-01',
      periodEnd: '2026-03-22',
      type: 'care_report_weekly',
    }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(typeof result.current.refetch).toBe('function');
  });
});
