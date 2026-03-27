// app/api/care/helpers/route.test.ts
// Nachbar.io — Tests fuer Helfer API-Route (GET + POST)
// Testet: Auth, Zugriffskontrolle, Rollen-Validierung, Doppelregistrierung

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { createRouteMockSupabase } from '@/lib/care/__tests__/mock-supabase';

const mockSupabase = createRouteMockSupabase();

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockImplementation(() => Promise.resolve(mockSupabase.supabase)),
}));

vi.mock('@/lib/care/audit', () => ({
  writeAuditLog: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/care/api-helpers', () => ({
  requireCareAccess: vi.fn().mockResolvedValue('admin'),
}));

import { GET, POST } from './route';
import { requireCareAccess } from '@/lib/care/api-helpers';

// Helpers
function createGetRequest(params: Record<string, string> = {}): NextRequest {
  const url = new URL('http://localhost:3000/api/care/helpers');
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new NextRequest(url);
}

function createPostRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost:3000/api/care/helpers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('GET /api/care/helpers', () => {
  beforeEach(() => {
    mockSupabase.reset();
    vi.clearAllMocks();
  });

  it('gibt 401 wenn nicht authentifiziert', async () => {
    const res = await GET(createGetRequest());
    expect(res.status).toBe(401);
  });

  it('laedt Helfer fuer authentifizierten User', async () => {
    mockSupabase.setUser({ id: 'user-1' });
    // Admin-Check (nicht-Admin)
    mockSupabase.addResponse('users', { data: { is_admin: false }, error: null });
    // Helfer-Query
    mockSupabase.addResponse('care_helpers', {
      data: [{ id: 'h-1', role: 'neighbor', user: { display_name: 'Max' } }],
      error: null,
    });

    const res = await GET(createGetRequest());
    expect(res.status).toBe(200);
  });

  it('prueft Zugriff bei senior_id-Parameter', async () => {
    mockSupabase.setUser({ id: 'helfer-1' });
    mockSupabase.addResponse('care_helpers', { data: [], error: null });

    await GET(createGetRequest({ senior_id: 'senior-1' }));
    // requireCareAccess sollte aufgerufen werden (da helfer-1 != senior-1)
    expect(requireCareAccess).toHaveBeenCalledWith(expect.anything(), 'senior-1');
  });

  it('gibt 403 bei fehlendem Zugriff auf Senior', async () => {
    mockSupabase.setUser({ id: 'fremder-1' });
    vi.mocked(requireCareAccess).mockResolvedValueOnce(null);

    const res = await GET(createGetRequest({ senior_id: 'senior-1' }));
    expect(res.status).toBe(403);
  });

  it('gibt 500 bei DB-Fehler', async () => {
    mockSupabase.setUser({ id: 'user-1' });
    mockSupabase.addResponse('users', { data: { is_admin: true }, error: null });
    mockSupabase.addResponse('care_helpers', { data: null, error: { message: 'DB-Error' } });

    const res = await GET(createGetRequest());
    expect(res.status).toBe(500);
  });
});

describe('POST /api/care/helpers', () => {
  beforeEach(() => {
    mockSupabase.reset();
    vi.clearAllMocks();
    mockSupabase.setUser({ id: 'user-1' });
  });

  it('gibt 401 wenn nicht authentifiziert', async () => {
    mockSupabase.setUser(null);
    const res = await POST(createPostRequest({ role: 'neighbor' }));
    expect(res.status).toBe(401);
  });

  it('weist fehlende Rolle ab', async () => {
    const res = await POST(createPostRequest({}));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('Ungueltige Rolle');
  });

  it('weist ungueltige Rolle ab', async () => {
    const res = await POST(createPostRequest({ role: 'hacker' }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('Ungueltige Rolle');
  });

  it('akzeptiert gueltige Rollen', async () => {
    for (const role of ['neighbor', 'relative', 'care_service']) {
      mockSupabase.reset();
      mockSupabase.setUser({ id: `user-${role}` });
      // existing-Check: nicht registriert
      mockSupabase.addResponse('care_helpers', { data: null, error: null });
      // Insert
      mockSupabase.addResponse('care_helpers', {
        data: { id: `h-${role}`, role, user: { display_name: 'Test' } },
        error: null,
      });

      const res = await POST(createPostRequest({ role }));
      expect(res.status).toBe(201);
    }
  });

  it('verhindert Doppelregistrierung (409)', async () => {
    mockSupabase.addResponse('care_helpers', { data: { id: 'existing-1' }, error: null });

    const res = await POST(createPostRequest({ role: 'neighbor' }));
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error).toContain('bereits als Helfer');
  });

  it('weist ungueltiges JSON ab', async () => {
    const req = new NextRequest('http://localhost:3000/api/care/helpers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'kein-json',
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
