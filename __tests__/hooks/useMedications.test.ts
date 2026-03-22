// __tests__/hooks/useMedications.test.ts
// Nachbar.io — Tests fuer useMedications Hook

import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { CareMedication } from '@/lib/care/types';

// Mock-Daten
const mockMeds: Partial<CareMedication>[] = [
  {
    id: 'med-1',
    senior_id: 'senior-1',
    name: 'Metformin',
    dosage: '500mg',
    schedule: { type: 'daily', times: ['08:00', '20:00'] },
    active: true,
    created_at: '2026-03-01T00:00:00Z',
  },
  {
    id: 'med-2',
    senior_id: 'senior-1',
    name: 'Ramipril',
    dosage: '5mg',
    schedule: { type: 'daily', times: ['08:00'] },
    active: true,
    created_at: '2026-03-10T00:00:00Z',
  },
];

// Supabase-Chain-Mock
const mockOrder = vi.fn().mockResolvedValue({ data: mockMeds });
const mockEqActive = vi.fn().mockReturnValue({ order: mockOrder });
const mockEqSenior = vi.fn().mockReturnValue({ eq: mockEqActive });
const mockSelect = vi.fn().mockReturnValue({ eq: mockEqSenior });
const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    from: mockFrom,
  })),
}));

import { useMedications } from '@/lib/care/hooks/useMedications';

describe('useMedications', () => {
  beforeEach(() => { vi.clearAllMocks(); });
  afterEach(() => { vi.restoreAllMocks(); });

  it('laedt aktive Medikamente fuer einen Senior', async () => {
    const { result } = renderHook(() => useMedications('senior-1'));

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.medications).toHaveLength(2);
    expect(result.current.medications[0].name).toBe('Metformin');
    expect(result.current.medications[1].name).toBe('Ramipril');
  });

  it('setzt loading=false wenn keine seniorId', async () => {
    const { result } = renderHook(() => useMedications(undefined));

    // Ohne seniorId wird sofort loading=false gesetzt
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.medications).toEqual([]);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('fragt nur aktive Medikamente ab (active=true)', async () => {
    renderHook(() => useMedications('senior-1'));

    await waitFor(() => {
      expect(mockFrom).toHaveBeenCalledWith('care_medications');
      expect(mockSelect).toHaveBeenCalledWith('*');
      expect(mockEqSenior).toHaveBeenCalledWith('senior_id', 'senior-1');
      expect(mockEqActive).toHaveBeenCalledWith('active', true);
    });
  });

  it('sortiert absteigend nach created_at', async () => {
    renderHook(() => useMedications('senior-1'));

    await waitFor(() => {
      expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: false });
    });
  });

  it('gibt leeres Array bei null-Daten zurueck', async () => {
    mockOrder.mockResolvedValueOnce({ data: null });

    const { result } = renderHook(() => useMedications('senior-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.medications).toEqual([]);
  });

  it('stellt refetch-Funktion bereit', async () => {
    const { result } = renderHook(() => useMedications('senior-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(typeof result.current.refetch).toBe('function');

    // Refetch ausfuehren
    mockFrom.mockClear();
    await act(async () => {
      await result.current.refetch();
    });

    expect(mockFrom).toHaveBeenCalledWith('care_medications');
  });

  it('reagiert auf seniorId-Wechsel', async () => {
    const { result, rerender } = renderHook(
      ({ id }: { id?: string }) => useMedications(id),
      { initialProps: { id: 'senior-1' } },
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    mockFrom.mockClear();
    rerender({ id: 'senior-2' });

    await waitFor(() => {
      expect(mockEqSenior).toHaveBeenCalledWith('senior_id', 'senior-2');
    });
  });
});
