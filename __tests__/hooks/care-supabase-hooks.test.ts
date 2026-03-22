// __tests__/hooks/care-supabase-hooks.test.ts
// Nachbar.io — Tests fuer Supabase-direkt-basierte Care-Hooks
// useAuditLog, useAssignedSeniors, useCareRole

import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// === Gemeinsamer Supabase-Mock ===
const mockMaybeSingle = vi.fn();
const mockSingle = vi.fn();
const mockLimit = vi.fn().mockResolvedValue({ data: [], error: null });
const mockIn = vi.fn().mockResolvedValue({ data: [], error: null });
const mockOrder = vi.fn().mockReturnValue({ limit: mockLimit });
const mockEq3 = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle, order: mockOrder });
const mockEq2 = vi.fn().mockReturnValue({ eq: mockEq3, maybeSingle: mockMaybeSingle, single: mockSingle, order: mockOrder });
const mockEq = vi.fn().mockReturnValue({ eq: mockEq2, order: mockOrder, single: mockSingle, in: mockIn });
const mockSelect = vi.fn().mockReturnValue({ eq: mockEq, in: mockIn });
const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });

const mockGetCachedUser = vi.fn();

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({ from: mockFrom })),
}));

vi.mock('@/lib/supabase/cached-auth', () => ({
  getCachedUser: (...args: unknown[]) => mockGetCachedUser(...args),
}));

import { useAuditLog } from '@/lib/care/hooks/useAuditLog';
import { useAssignedSeniors } from '@/lib/care/hooks/useAssignedSeniors';
import { useCareRole } from '@/lib/care/hooks/useCareRole';

// === useAuditLog ===
describe('useAuditLog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLimit.mockResolvedValue({
      data: [
        { id: 'audit-1', event_type: 'profile_updated', created_at: '2026-03-22T10:00:00Z' },
        { id: 'audit-2', event_type: 'sos_triggered', created_at: '2026-03-21T14:00:00Z' },
      ],
      error: null,
    });
  });

  it('laedt Audit-Log-Eintraege', async () => {
    const { result } = renderHook(() => useAuditLog('senior-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.entries).toHaveLength(2);
  });

  it('setzt loading=false wenn keine seniorId', () => {
    const { result } = renderHook(() => useAuditLog(undefined));
    expect(result.current.loading).toBe(false);
    expect(result.current.entries).toEqual([]);
  });

  it('fragt care_audit_log Tabelle ab', async () => {
    renderHook(() => useAuditLog('senior-1'));
    await waitFor(() => expect(mockFrom).toHaveBeenCalledWith('care_audit_log'));
  });

  it('verwendet Standard-Limit 50', async () => {
    renderHook(() => useAuditLog('senior-1'));
    await waitFor(() => expect(mockLimit).toHaveBeenCalledWith(50));
  });

  it('akzeptiert benutzerdefiniertes Limit', async () => {
    renderHook(() => useAuditLog('senior-1', 10));
    await waitFor(() => expect(mockLimit).toHaveBeenCalledWith(10));
  });

  it('sortiert absteigend nach created_at', async () => {
    renderHook(() => useAuditLog('senior-1'));
    await waitFor(() => expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: false }));
  });
});

// === useAssignedSeniors ===
describe('useAssignedSeniors', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCachedUser.mockResolvedValue({ user: { id: 'helfer-1' } });
    mockMaybeSingle.mockResolvedValue({
      data: { role: 'neighbor', assigned_seniors: ['senior-1', 'senior-2'] },
      error: null,
    });
    mockIn.mockResolvedValue({
      data: [
        { id: 'senior-1', display_name: 'Frau Mueller', avatar_url: null },
        { id: 'senior-2', display_name: 'Herr Schmidt', avatar_url: '/img.jpg' },
      ],
      error: null,
    });
  });

  it('laedt zugewiesene Senioren', async () => {
    const { result } = renderHook(() => useAssignedSeniors());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.seniors).toHaveLength(2);
    expect(result.current.seniors[0].display_name).toBe('Frau Mueller');
    expect(result.current.helperRole).toBe('neighbor');
  });

  it('gibt leere Liste wenn kein User', async () => {
    mockGetCachedUser.mockResolvedValue({ user: null });
    const { result } = renderHook(() => useAssignedSeniors());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.seniors).toEqual([]);
  });

  it('gibt leere Liste wenn kein Helfer-Record', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    const { result } = renderHook(() => useAssignedSeniors());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.seniors).toEqual([]);
  });

  it('gibt leere Liste wenn keine zugewiesenen Senioren', async () => {
    mockMaybeSingle.mockResolvedValue({ data: { role: 'neighbor', assigned_seniors: [] }, error: null });
    const { result } = renderHook(() => useAssignedSeniors());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.seniors).toEqual([]);
  });

  it('setzt error bei Helfer-Abfragefehler', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: { message: 'Zugriff verweigert' } });
    const { result } = renderHook(() => useAssignedSeniors());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('Zugriff verweigert');
  });
});

// === useCareRole ===
describe('useCareRole', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCachedUser.mockResolvedValue({ user: { id: 'user-1' } });
  });

  it('erkennt Senior-Rolle (eigene ID)', async () => {
    const { result } = renderHook(() => useCareRole('user-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.role).toBe('senior');
  });

  it('setzt loading=false wenn keine seniorId', () => {
    const { result } = renderHook(() => useCareRole(undefined));
    expect(result.current.loading).toBe(false);
    expect(result.current.role).toBe('none');
  });

  it('erkennt Admin-Rolle', async () => {
    mockGetCachedUser.mockResolvedValue({ user: { id: 'admin-1' } });
    mockSingle.mockResolvedValue({ data: { is_admin: true }, error: null });

    const { result } = renderHook(() => useCareRole('senior-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.role).toBe('admin');
  });

  it('erkennt Helfer-Rolle', async () => {
    mockGetCachedUser.mockResolvedValue({ user: { id: 'helfer-1' } });
    mockSingle.mockResolvedValue({ data: { is_admin: false }, error: null });
    mockMaybeSingle.mockResolvedValue({
      data: { role: 'caregiver', assigned_seniors: ['senior-1'] },
      error: null,
    });

    const { result } = renderHook(() => useCareRole('senior-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.role).toBe('caregiver');
  });

  it('gibt none wenn kein Zugriff', async () => {
    mockGetCachedUser.mockResolvedValue({ user: { id: 'fremder-1' } });
    mockSingle.mockResolvedValue({ data: { is_admin: false }, error: null });
    mockMaybeSingle.mockResolvedValue({
      data: { role: 'neighbor', assigned_seniors: ['senior-99'] },
      error: null,
    });

    const { result } = renderHook(() => useCareRole('senior-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.role).toBe('none');
  });

  it('gibt none wenn kein User eingeloggt', async () => {
    mockGetCachedUser.mockResolvedValue({ user: null });
    const { result } = renderHook(() => useCareRole('senior-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.role).toBe('none');
  });
});
