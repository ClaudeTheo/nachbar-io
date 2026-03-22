// __tests__/hooks/useCheckins.test.ts
// Nachbar.io — Tests fuer useCheckins Hook

import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { CareCheckin } from '@/lib/care/types';

// Mock-Daten
const mockCheckins: Partial<CareCheckin>[] = [
  {
    id: 'checkin-1',
    senior_id: 'senior-1',
    status: 'ok',
    mood: 'good',
    note: null,
    scheduled_at: '2026-03-22T08:00:00Z',
    completed_at: '2026-03-22T08:05:00Z',
    escalated: false,
    created_at: '2026-03-22T08:05:00Z',
  },
  {
    id: 'checkin-2',
    senior_id: 'senior-1',
    status: 'not_well',
    mood: 'bad',
    note: null,
    scheduled_at: '2026-03-21T20:00:00Z',
    completed_at: '2026-03-21T20:15:00Z',
    escalated: false,
    created_at: '2026-03-21T20:15:00Z',
  },
  {
    id: 'checkin-3',
    senior_id: 'senior-1',
    status: 'missed',
    mood: null,
    note: null,
    scheduled_at: '2026-03-21T08:00:00Z',
    completed_at: null,
    escalated: true,
    created_at: '2026-03-21T08:00:00Z',
  },
];

// Supabase-Chain-Mock
const mockLimit = vi.fn().mockResolvedValue({ data: mockCheckins });
const mockOrder = vi.fn().mockReturnValue({ limit: mockLimit });
const mockEq = vi.fn().mockReturnValue({ order: mockOrder });
const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    from: mockFrom,
  })),
}));

import { useCheckins } from '@/lib/care/hooks/useCheckins';

describe('useCheckins', () => {
  beforeEach(() => { vi.clearAllMocks(); });
  afterEach(() => { vi.restoreAllMocks(); });

  it('laedt Check-ins fuer einen Senior', async () => {
    const { result } = renderHook(() => useCheckins('senior-1'));

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.checkins).toHaveLength(3);
  });

  it('setzt loading=false wenn keine seniorId', async () => {
    const { result } = renderHook(() => useCheckins(undefined));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.checkins).toEqual([]);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('fragt care_checkins mit korrekten Filtern', async () => {
    renderHook(() => useCheckins('senior-1'));

    await waitFor(() => {
      expect(mockFrom).toHaveBeenCalledWith('care_checkins');
      expect(mockSelect).toHaveBeenCalledWith('*');
      expect(mockEq).toHaveBeenCalledWith('senior_id', 'senior-1');
    });
  });

  it('sortiert absteigend nach scheduled_at', async () => {
    renderHook(() => useCheckins('senior-1'));

    await waitFor(() => {
      expect(mockOrder).toHaveBeenCalledWith('scheduled_at', { ascending: false });
    });
  });

  it('verwendet Standard-Limit von 30', async () => {
    renderHook(() => useCheckins('senior-1'));

    await waitFor(() => {
      expect(mockLimit).toHaveBeenCalledWith(30);
    });
  });

  it('akzeptiert benutzerdefiniertes Limit', async () => {
    renderHook(() => useCheckins('senior-1', 10));

    await waitFor(() => {
      expect(mockLimit).toHaveBeenCalledWith(10);
    });
  });

  it('gibt leeres Array bei null-Daten zurueck', async () => {
    mockLimit.mockResolvedValueOnce({ data: null });

    const { result } = renderHook(() => useCheckins('senior-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.checkins).toEqual([]);
  });

  it('enthaelt verschiedene Check-in-Status', async () => {
    const { result } = renderHook(() => useCheckins('senior-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const statuses = result.current.checkins.map(c => c.status);
    expect(statuses).toContain('ok');
    expect(statuses).toContain('not_well');
    expect(statuses).toContain('missed');
  });

  it('erkennt eskalierte Check-ins', async () => {
    const { result } = renderHook(() => useCheckins('senior-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const escalated = result.current.checkins.filter(c => c.escalated);
    expect(escalated).toHaveLength(1);
    expect(escalated[0].status).toBe('missed');
  });

  it('reagiert auf seniorId-Wechsel', async () => {
    const { result, rerender } = renderHook(
      ({ id }: { id?: string }) => useCheckins(id),
      { initialProps: { id: 'senior-1' } },
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    mockFrom.mockClear();
    rerender({ id: 'senior-2' });

    await waitFor(() => {
      expect(mockEq).toHaveBeenCalledWith('senior_id', 'senior-2');
    });
  });
});
