// app/api/care/checkin/status/route.test.ts
// Nachbar.io — Tests für Check-in-Status API-Route
// Testet: Auth, Zugriffskontrolle, Tagesberechnung, Verschlüsselung, nextDue

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { createRouteMockSupabase } from '@/lib/care/__tests__/mock-supabase';

const mockSupabase = createRouteMockSupabase();

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockImplementation(() => Promise.resolve(mockSupabase.supabase)),
}));

vi.mock('@/lib/care/api-helpers', () => ({
  requireCareAccess: vi.fn().mockResolvedValue('admin'),
}));

vi.mock('@/lib/care/field-encryption', () => ({
  decryptFieldsArray: vi.fn((_data: unknown) => _data),
  CARE_CHECKINS_ENCRYPTED_FIELDS: ['note'],
}));

import { GET } from './route';
import { requireCareAccess } from '@/lib/care/api-helpers';

function createGetRequest(params: Record<string, string> = {}): NextRequest {
  const url = new URL('http://localhost:3000/api/care/checkin/status');
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new NextRequest(url);
}

describe('GET /api/care/checkin/status', () => {
  beforeEach(() => {
    mockSupabase.reset();
    vi.clearAllMocks();
  });

  it('gibt 401 wenn nicht authentifiziert', async () => {
    const res = await GET(createGetRequest());
    expect(res.status).toBe(401);
  });

  it('lädt Status für eigenen User', async () => {
    mockSupabase.setUser({ id: 'user-1' });
    // Checkins-Query
    mockSupabase.addResponse('care_checkins', { data: [], error: null });
    // Profile-Query
    mockSupabase.addResponse('care_profiles', {
      data: { checkin_times: ['08:00', '20:00'], checkin_enabled: true },
      error: null,
    });

    const res = await GET(createGetRequest());
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.checkinTimes).toEqual(['08:00', '20:00']);
    expect(json.checkinEnabled).toBe(true);
    expect(json.totalCount).toBe(2);
    expect(json.completedCount).toBe(0);
  });

  it('prüft Zugriff bei Fremd-Zugriff', async () => {
    mockSupabase.setUser({ id: 'helfer-1' });
    mockSupabase.addResponse('care_checkins', { data: [], error: null });
    mockSupabase.addResponse('care_profiles', {
      data: { checkin_times: ['08:00'], checkin_enabled: true },
      error: null,
    });

    await GET(createGetRequest({ senior_id: 'senior-1' }));
    expect(requireCareAccess).toHaveBeenCalledWith(expect.anything(), 'senior-1');
  });

  it('gibt 403 bei fehlendem Zugriff', async () => {
    mockSupabase.setUser({ id: 'fremder-1' });
    vi.mocked(requireCareAccess).mockResolvedValueOnce(null);

    const res = await GET(createGetRequest({ senior_id: 'senior-1' }));
    expect(res.status).toBe(403);
  });

  it('zählt abgeschlossene Check-ins korrekt', async () => {
    mockSupabase.setUser({ id: 'user-1' });
    mockSupabase.addResponse('care_checkins', {
      data: [
        { id: 'c-1', status: 'ok', completed_at: '2026-03-22T08:05:00Z', scheduled_at: '2026-03-22T08:00:00Z' },
        { id: 'c-2', status: 'missed', completed_at: null, scheduled_at: '2026-03-22T12:00:00Z' },
      ],
      error: null,
    });
    mockSupabase.addResponse('care_profiles', {
      data: { checkin_times: ['08:00', '12:00', '20:00'], checkin_enabled: true },
      error: null,
    });

    const res = await GET(createGetRequest());
    const json = await res.json();
    expect(json.completedCount).toBe(1);
    expect(json.totalCount).toBe(3);
    expect(json.allCompleted).toBe(false);
  });

  it('verwendet Defaults wenn kein Profil existiert', async () => {
    mockSupabase.setUser({ id: 'user-1' });
    mockSupabase.addResponse('care_checkins', { data: [], error: null });
    mockSupabase.addResponse('care_profiles', { data: null, error: null });

    const res = await GET(createGetRequest());
    const json = await res.json();
    expect(json.checkinEnabled).toBe(true);
    expect(json.checkinTimes).toBeDefined();
    expect(Array.isArray(json.checkinTimes)).toBe(true);
  });

  it('gibt 500 bei Check-in-DB-Fehler', async () => {
    mockSupabase.setUser({ id: 'user-1' });
    mockSupabase.addResponse('care_checkins', { data: null, error: { message: 'DB-Error' } });
    mockSupabase.addResponse('care_profiles', { data: null, error: null });

    const res = await GET(createGetRequest());
    expect(res.status).toBe(500);
  });

  it('gibt 500 bei Profil-DB-Fehler', async () => {
    mockSupabase.setUser({ id: 'user-1' });
    mockSupabase.addResponse('care_checkins', { data: [], error: null });
    mockSupabase.addResponse('care_profiles', { data: null, error: { message: 'DB-Error' } });

    const res = await GET(createGetRequest());
    expect(res.status).toBe(500);
  });

  it('erkennt allCompleted korrekt', async () => {
    mockSupabase.setUser({ id: 'user-1' });
    mockSupabase.addResponse('care_checkins', {
      data: [
        { id: 'c-1', status: 'ok', completed_at: '2026-03-22T08:05:00Z', scheduled_at: '2026-03-22T08:00:00Z' },
        { id: 'c-2', status: 'ok', completed_at: '2026-03-22T20:05:00Z', scheduled_at: '2026-03-22T20:00:00Z' },
      ],
      error: null,
    });
    mockSupabase.addResponse('care_profiles', {
      data: { checkin_times: ['08:00', '20:00'], checkin_enabled: true },
      error: null,
    });

    const res = await GET(createGetRequest());
    const json = await res.json();
    expect(json.allCompleted).toBe(true);
    expect(json.completedCount).toBe(2);
  });
});
