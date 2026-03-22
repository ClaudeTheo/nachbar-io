// __tests__/api/care/medications/medications-due.test.ts
// Faellige Medikamente fuer heute berechnen

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

const mockRequireAuth = vi.fn();
const mockRequireSubscription = vi.fn();
const mockRequireCareAccess = vi.fn();

vi.mock('@/lib/care/api-helpers', () => ({
  requireAuth: (...args: unknown[]) => mockRequireAuth(...args),
  requireSubscription: (...args: unknown[]) => mockRequireSubscription(...args),
  requireCareAccess: (...args: unknown[]) => mockRequireCareAccess(...args),
  unauthorizedResponse: () => NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 }),
}));

vi.mock('@/lib/care/field-encryption', () => ({
  decryptFieldsArray: vi.fn((arr: Record<string, unknown>[]) => arr),
  CARE_MEDICATIONS_ENCRYPTED_FIELDS: ['name', 'dosage', 'instructions'],
}));

function createChain(resolveData: unknown = [], resolveError: unknown = null) {
  const chain: Record<string, unknown> = {};
  chain.select = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.gte = vi.fn().mockReturnValue(chain);
  chain.lt = vi.fn().mockReturnValue(chain);
  chain.order = vi.fn().mockReturnValue(chain);
  chain.then = (resolve: (v: { data: unknown; error: unknown }) => void) =>
    resolve({ data: resolveData, error: resolveError });
  return chain;
}

describe('GET /api/care/medications/due', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('gibt 401 ohne Authentifizierung zurueck', async () => {
    mockRequireAuth.mockResolvedValue(null);
    const { GET } = await import('@/app/api/care/medications/due/route');
    const req = new NextRequest('http://localhost/api/care/medications/due');
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('gibt 403 bei fehlendem Plus-Abo zurueck', async () => {
    mockRequireAuth.mockResolvedValue({ supabase: { from: vi.fn() }, user: { id: 'u1' } });
    mockRequireSubscription.mockResolvedValue(
      NextResponse.json({ error: 'Plus-Abo erforderlich' }, { status: 403 })
    );
    const { GET } = await import('@/app/api/care/medications/due/route');
    const req = new NextRequest('http://localhost/api/care/medications/due');
    const res = await GET(req);
    expect(res.status).toBe(403);
  });

  it('gibt faellige Medikamente zurueck (200)', async () => {
    const meds = [
      { id: 'm1', name: 'Aspirin', senior_id: 'u1', active: true, schedule: { type: 'daily', times: ['08:00', '20:00'] } },
    ];
    const logs: unknown[] = [];

    let callCount = 0;
    const mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === 'care_medications') return createChain(meds);
        if (table === 'care_medication_logs') return createChain(logs);
        return createChain();
      }),
    };

    mockRequireAuth.mockResolvedValue({ supabase: mockSupabase, user: { id: 'u1' } });
    mockRequireSubscription.mockResolvedValue(true);

    const { GET } = await import('@/app/api/care/medications/due/route');
    const req = new NextRequest('http://localhost/api/care/medications/due');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    // Sollte 2 Eintraege haben (08:00 und 20:00)
    expect(data).toHaveLength(2);
  });

  it('gibt leere Liste bei keinen aktiven Medikamenten zurueck', async () => {
    const mockSupabase = {
      from: vi.fn().mockReturnValue(createChain([])),
    };
    mockRequireAuth.mockResolvedValue({ supabase: mockSupabase, user: { id: 'u1' } });
    mockRequireSubscription.mockResolvedValue(true);

    const { GET } = await import('@/app/api/care/medications/due/route');
    const req = new NextRequest('http://localhost/api/care/medications/due');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveLength(0);
  });

  it('prueft Zugriff bei fremdem senior_id (403)', async () => {
    const mockSupabase = { from: vi.fn().mockReturnValue(createChain()) };
    mockRequireAuth.mockResolvedValue({ supabase: mockSupabase, user: { id: 'u1' } });
    mockRequireSubscription.mockResolvedValue(true);
    mockRequireCareAccess.mockResolvedValue(null);

    const { GET } = await import('@/app/api/care/medications/due/route');
    const req = new NextRequest('http://localhost/api/care/medications/due?senior_id=other-user');
    const res = await GET(req);
    expect(res.status).toBe(403);
  });
});
