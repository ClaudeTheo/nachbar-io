// __tests__/api/care/stats/stats.test.ts
// Aggregierte Pflege-Statistiken

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextResponse } from 'next/server';

const mockRequireAuth = vi.fn();
const mockRequireAdmin = vi.fn();
const mockRequireCareAccess = vi.fn();

vi.mock('@/lib/care/api-helpers', () => ({
  requireAuth: (...args: unknown[]) => mockRequireAuth(...args),
  requireAdmin: (...args: unknown[]) => mockRequireAdmin(...args),
  requireCareAccess: (...args: unknown[]) => mockRequireCareAccess(...args),
  errorResponse: (msg: string, status: number) => NextResponse.json({ error: msg }, { status }),
  successResponse: (data: unknown, status = 200) => NextResponse.json(data, { status }),
  careLog: vi.fn(),
}));

// Alle Supabase-Abfragen muessen count-Ergebnisse liefern
function createCountChain(count = 0, data: unknown[] = []) {
  const chain: Record<string, unknown> = {};
  chain.select = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.gte = vi.fn().mockReturnValue(chain);
  chain.then = (resolve: (v: { data: unknown[]; error: null; count: number }) => void) =>
    resolve({ data, error: null, count });
  return chain;
}

describe('GET /api/care/stats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('gibt 401 ohne Authentifizierung zurueck', async () => {
    mockRequireAuth.mockResolvedValue(null);
    const { GET } = await import('@/app/api/care/stats/route');
    const req = new Request('http://localhost/api/care/stats');
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('gibt 403 ohne senior_id und ohne Admin-Rechte zurueck', async () => {
    const mockSupabase = { from: vi.fn().mockReturnValue(createCountChain()) };
    mockRequireAuth.mockResolvedValue({ supabase: mockSupabase, user: { id: 'u1' } });
    mockRequireAdmin.mockResolvedValue(false);

    const { GET } = await import('@/app/api/care/stats/route');
    const req = new Request('http://localhost/api/care/stats');
    const res = await GET(req);
    expect(res.status).toBe(403);
  });

  it('gibt Statistiken fuer eigenen Senior zurueck (200)', async () => {
    const mockSupabase = {
      from: vi.fn().mockReturnValue(createCountChain(5, [{ plan: 'basic' }])),
    };
    mockRequireAuth.mockResolvedValue({ supabase: mockSupabase, user: { id: 'u1' } });

    const { GET } = await import('@/app/api/care/stats/route');
    const req = new Request('http://localhost/api/care/stats?senior_id=u1');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty('seniors');
    expect(data).toHaveProperty('sos');
    expect(data).toHaveProperty('checkins');
    expect(data).toHaveProperty('medications');
  });

  it('prueft Zugriff bei fremdem senior_id (403)', async () => {
    const mockSupabase = { from: vi.fn().mockReturnValue(createCountChain()) };
    mockRequireAuth.mockResolvedValue({ supabase: mockSupabase, user: { id: 'u1' } });
    mockRequireCareAccess.mockResolvedValue(null);

    const { GET } = await import('@/app/api/care/stats/route');
    const req = new Request('http://localhost/api/care/stats?senior_id=other-user');
    const res = await GET(req);
    expect(res.status).toBe(403);
  });

  it('erlaubt Admin systemweite Statistiken', async () => {
    const mockSupabase = {
      from: vi.fn().mockReturnValue(createCountChain(10, [{ plan: 'basic' }])),
    };
    mockRequireAuth.mockResolvedValue({ supabase: mockSupabase, user: { id: 'admin-1' } });
    mockRequireAdmin.mockResolvedValue(true);

    const { GET } = await import('@/app/api/care/stats/route');
    const req = new Request('http://localhost/api/care/stats');
    const res = await GET(req);
    expect(res.status).toBe(200);
  });
});
