// __tests__/hooks/useSosAlerts.test.ts
// Nachbar.io — Tests fuer useSosAlerts Hook (Realtime + Datenabfrage)

import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { CareSosAlert } from '@/lib/care/types';

// Mock-Daten
const mockAlerts: Partial<CareSosAlert>[] = [
  {
    id: 'sos-1',
    senior_id: 'senior-1',
    category: 'medical_emergency',
    status: 'triggered',
    current_escalation_level: 1,
    created_at: '2026-03-22T10:00:00Z',
  },
  {
    id: 'sos-2',
    senior_id: 'senior-1',
    category: 'general_help',
    status: 'resolved',
    current_escalation_level: 0,
    created_at: '2026-03-21T14:00:00Z',
  },
];

// Supabase-Mock mit Channel
const mockSubscribe = vi.fn().mockReturnValue({ id: 'channel-1' });
const mockOn = vi.fn().mockReturnValue({ subscribe: mockSubscribe });
const mockChannel = vi.fn().mockReturnValue({ on: mockOn });
const mockRemoveChannel = vi.fn();
const mockLimit = vi.fn().mockResolvedValue({ data: mockAlerts });
const mockOrder = vi.fn().mockReturnValue({ limit: mockLimit });
const mockEq = vi.fn().mockReturnValue({ order: mockOrder });
const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    from: mockFrom,
    channel: mockChannel,
    removeChannel: mockRemoveChannel,
  })),
}));

import { useSosAlerts } from '@/lib/care/hooks/useSosAlerts';

describe('useSosAlerts', () => {
  beforeEach(() => { vi.clearAllMocks(); });
  afterEach(() => { vi.restoreAllMocks(); });

  it('laedt SOS-Alerts fuer einen Senior', async () => {
    const { result } = renderHook(() => useSosAlerts('senior-1'));

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.alerts).toHaveLength(2);
    expect(result.current.alerts[0].category).toBe('medical_emergency');
  });

  it('setzt loading=false wenn keine seniorId', () => {
    const { result } = renderHook(() => useSosAlerts(undefined));

    expect(result.current.loading).toBe(false);
    expect(result.current.alerts).toEqual([]);
  });

  it('fragt care_sos_alerts Tabelle mit korrekten Filtern', async () => {
    renderHook(() => useSosAlerts('senior-1'));

    await waitFor(() => {
      expect(mockFrom).toHaveBeenCalledWith('care_sos_alerts');
      expect(mockSelect).toHaveBeenCalledWith('*');
      expect(mockEq).toHaveBeenCalledWith('senior_id', 'senior-1');
    });
  });

  it('sortiert absteigend nach created_at, limitiert auf 20', async () => {
    renderHook(() => useSosAlerts('senior-1'));

    await waitFor(() => {
      expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: false });
      expect(mockLimit).toHaveBeenCalledWith(20);
    });
  });

  it('erstellt Realtime-Channel fuer SOS-Updates', async () => {
    renderHook(() => useSosAlerts('senior-1'));

    await waitFor(() => {
      expect(mockChannel).toHaveBeenCalledWith('care-sos-senior-1');
      expect(mockOn).toHaveBeenCalledWith(
        'postgres_changes',
        expect.objectContaining({
          event: '*',
          schema: 'public',
          table: 'care_sos_alerts',
          filter: 'senior_id=eq.senior-1',
        }),
        expect.any(Function),
      );
      expect(mockSubscribe).toHaveBeenCalled();
    });
  });

  it('raeumt Realtime-Channel beim Unmount auf', async () => {
    const { unmount } = renderHook(() => useSosAlerts('senior-1'));

    await waitFor(() => {
      expect(mockSubscribe).toHaveBeenCalled();
    });

    unmount();
    expect(mockRemoveChannel).toHaveBeenCalled();
  });

  it('gibt leeres Array bei null-Daten zurueck', async () => {
    mockLimit.mockResolvedValueOnce({ data: null });

    const { result } = renderHook(() => useSosAlerts('senior-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.alerts).toEqual([]);
  });

  it('reagiert auf seniorId-Wechsel', async () => {
    const { result, rerender } = renderHook(
      ({ id }: { id?: string }) => useSosAlerts(id),
      { initialProps: { id: 'senior-1' } },
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Senior wechseln — neuer Fetch
    mockFrom.mockClear();
    rerender({ id: 'senior-2' });

    await waitFor(() => {
      expect(mockEq).toHaveBeenCalledWith('senior_id', 'senior-2');
    });
  });
});
