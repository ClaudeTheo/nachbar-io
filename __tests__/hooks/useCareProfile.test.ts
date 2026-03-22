// __tests__/hooks/useCareProfile.test.ts
// Nachbar.io — Tests fuer useCareProfile Hook

import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { CareProfile } from '@/lib/care/types';

// Mock-Daten
const mockProfile: Partial<CareProfile> = {
  id: 'profile-1',
  user_id: 'user-1',
  care_level: '3',
  emergency_contacts: [
    { name: 'Anna Müller', phone_encrypted: 'enc:+49176xxx', role: 'relative', priority: 1, relationship: 'Tochter' },
  ],
  medical_notes: null,
  preferred_hospital: 'St. Blasien',
  insurance_number: null,
  checkin_times: ['08:00', '20:00'],
  checkin_enabled: true,
  escalation_config: {
    escalate_to_level_2_after_minutes: 240,
    escalate_to_level_3_after_minutes: 480,
    escalate_to_level_4_after_minutes: 720,
  },
  created_at: '2026-03-01T00:00:00Z',
  updated_at: '2026-03-20T00:00:00Z',
};

// Supabase-Chain-Mock
const mockMaybeSingle = vi.fn().mockResolvedValue({ data: mockProfile, error: null });
const mockEq = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    from: mockFrom,
  })),
}));

import { useCareProfile } from '@/lib/care/hooks/useCareProfile';

describe('useCareProfile', () => {
  beforeEach(() => { vi.clearAllMocks(); });
  afterEach(() => { vi.restoreAllMocks(); });

  it('laedt Care-Profil fuer einen User', async () => {
    const { result } = renderHook(() => useCareProfile('user-1'));

    expect(result.current.loading).toBe(true);
    expect(result.current.profile).toBeNull();

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.profile).toBeDefined();
    expect(result.current.profile?.care_level).toBe('3');
    expect(result.current.profile?.checkin_enabled).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it('setzt loading=false wenn keine userId', async () => {
    const { result } = renderHook(() => useCareProfile(undefined));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.profile).toBeNull();
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('fragt care_profiles mit maybeSingle ab', async () => {
    renderHook(() => useCareProfile('user-1'));

    await waitFor(() => {
      expect(mockFrom).toHaveBeenCalledWith('care_profiles');
      expect(mockSelect).toHaveBeenCalledWith('*');
      expect(mockEq).toHaveBeenCalledWith('user_id', 'user-1');
      expect(mockMaybeSingle).toHaveBeenCalled();
    });
  });

  it('setzt error bei Supabase-Fehler', async () => {
    mockMaybeSingle.mockResolvedValueOnce({
      data: null,
      error: { message: 'Zugriff verweigert' },
    });

    const { result } = renderHook(() => useCareProfile('user-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Zugriff verweigert');
    expect(result.current.profile).toBeNull();
  });

  it('gibt null-Profil wenn keines existiert', async () => {
    mockMaybeSingle.mockResolvedValueOnce({ data: null, error: null });

    const { result } = renderHook(() => useCareProfile('user-neue'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.profile).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('enthaelt Notfallkontakte im Profil', async () => {
    const { result } = renderHook(() => useCareProfile('user-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.profile?.emergency_contacts).toHaveLength(1);
    expect(result.current.profile?.emergency_contacts[0].role).toBe('relative');
    expect(result.current.profile?.emergency_contacts[0].priority).toBe(1);
  });

  it('enthaelt Eskalations-Konfiguration', async () => {
    const { result } = renderHook(() => useCareProfile('user-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const esc = result.current.profile?.escalation_config;
    expect(esc?.escalate_to_level_2_after_minutes).toBe(240);
    expect(esc?.escalate_to_level_3_after_minutes).toBe(480);
    expect(esc?.escalate_to_level_4_after_minutes).toBe(720);
  });
});
