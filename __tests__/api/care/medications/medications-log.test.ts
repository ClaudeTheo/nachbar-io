// __tests__/api/care/medications/medications-log.test.ts
// Medikamenten-Einnahme protokollieren und Log abrufen

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

vi.mock('@/lib/care/audit', () => ({
  writeAuditLog: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/care/notifications', () => ({
  sendCareNotification: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/care/constants', () => ({
  MEDICATION_DEFAULTS: { snoozeMinutes: 30 },
}));

vi.mock('@/lib/care/field-encryption', () => ({
  decryptField: vi.fn((v: string) => v),
}));

function createChain(resolveData: unknown = null, resolveError: unknown = null) {
  const chain: Record<string, unknown> = {};
  chain.select = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.gte = vi.fn().mockReturnValue(chain);
  chain.lt = vi.fn().mockReturnValue(chain);
  chain.contains = vi.fn().mockReturnValue(chain);
  chain.order = vi.fn().mockReturnValue(chain);
  chain.limit = vi.fn().mockReturnValue(chain);
  chain.single = vi.fn().mockResolvedValue({ data: resolveData, error: resolveError });
  chain.maybeSingle = vi.fn().mockResolvedValue({ data: resolveData, error: resolveError });
  chain.insert = vi.fn().mockReturnValue(chain);
  chain.update = vi.fn().mockReturnValue(chain);
  chain.then = (resolve: (v: { data: unknown; error: unknown }) => void) =>
    resolve({ data: resolveData, error: resolveError });
  return chain;
}

describe('POST /api/care/medications/log', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('gibt 401 ohne Authentifizierung zurueck', async () => {
    mockRequireAuth.mockResolvedValue(null);
    const { POST } = await import('@/app/api/care/medications/log/route');
    const req = new NextRequest('http://localhost/api/care/medications/log', {
      method: 'POST',
      body: JSON.stringify({ medication_id: 'm1', status: 'taken', scheduled_at: '2026-03-22T08:00:00' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('erstellt neuen Log-Eintrag (201)', async () => {
    const logEntry = { id: 'log-1', medication_id: 'm1', status: 'taken', confirmed_at: '2026-03-22T08:01:00Z' };
    // maybeSingle fuer existing-check gibt null zurueck (kein vorhandener Eintrag)
    const existingChain = createChain(null);
    // insert-chain fuer neuen Eintrag
    const insertChain = createChain(logEntry);

    let callCount = 0;
    const mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === 'care_medication_logs') {
          callCount++;
          return callCount === 1 ? existingChain : insertChain;
        }
        return createChain();
      }),
    };

    mockRequireAuth.mockResolvedValue({ supabase: mockSupabase, user: { id: 'u1' } });
    mockRequireSubscription.mockResolvedValue(true);

    const { POST } = await import('@/app/api/care/medications/log/route');
    const req = new NextRequest('http://localhost/api/care/medications/log', {
      method: 'POST',
      body: JSON.stringify({ medication_id: 'm1', status: 'taken', scheduled_at: '2026-03-22T08:00:00' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
  });

  it('lehnt ab ohne Pflichtfelder (400)', async () => {
    const mockSupabase = { from: vi.fn() };
    mockRequireAuth.mockResolvedValue({ supabase: mockSupabase, user: { id: 'u1' } });
    mockRequireSubscription.mockResolvedValue(true);

    const { POST } = await import('@/app/api/care/medications/log/route');
    const req = new NextRequest('http://localhost/api/care/medications/log', {
      method: 'POST',
      body: JSON.stringify({ medication_id: 'm1' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('lehnt ungueltigen Status ab (400)', async () => {
    const mockSupabase = { from: vi.fn() };
    mockRequireAuth.mockResolvedValue({ supabase: mockSupabase, user: { id: 'u1' } });
    mockRequireSubscription.mockResolvedValue(true);

    const { POST } = await import('@/app/api/care/medications/log/route');
    const req = new NextRequest('http://localhost/api/care/medications/log', {
      method: 'POST',
      body: JSON.stringify({ medication_id: 'm1', status: 'maybe', scheduled_at: '2026-03-22T08:00:00' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('lehnt ungueltiges JSON ab (400)', async () => {
    const mockSupabase = { from: vi.fn() };
    mockRequireAuth.mockResolvedValue({ supabase: mockSupabase, user: { id: 'u1' } });
    mockRequireSubscription.mockResolvedValue(true);

    const { POST } = await import('@/app/api/care/medications/log/route');
    const req = new NextRequest('http://localhost/api/care/medications/log', {
      method: 'POST',
      body: 'not json',
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});

describe('GET /api/care/medications/log', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('gibt 401 ohne Authentifizierung zurueck', async () => {
    mockRequireAuth.mockResolvedValue(null);
    const { GET } = await import('@/app/api/care/medications/log/route');
    const req = new NextRequest('http://localhost/api/care/medications/log');
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('gibt Log-Eintraege zurueck (200)', async () => {
    const logs = [
      { id: 'log-1', medication_id: 'm1', status: 'taken', medication: { name: 'Aspirin', dosage: '100mg' } },
    ];
    const chain = createChain(logs);
    const mockSupabase = { from: vi.fn().mockReturnValue(chain) };
    mockRequireAuth.mockResolvedValue({ supabase: mockSupabase, user: { id: 'u1' } });
    mockRequireSubscription.mockResolvedValue(true);

    const { GET } = await import('@/app/api/care/medications/log/route');
    const req = new NextRequest('http://localhost/api/care/medications/log');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveLength(1);
  });

  it('prueft Zugriff bei fremdem senior_id (403)', async () => {
    const mockSupabase = { from: vi.fn().mockReturnValue(createChain()) };
    mockRequireAuth.mockResolvedValue({ supabase: mockSupabase, user: { id: 'u1' } });
    mockRequireSubscription.mockResolvedValue(true);
    mockRequireCareAccess.mockResolvedValue(null);

    const { GET } = await import('@/app/api/care/medications/log/route');
    const req = new NextRequest('http://localhost/api/care/medications/log?senior_id=other-user');
    const res = await GET(req);
    expect(res.status).toBe(403);
  });

  it('gibt 403 bei fehlendem Plus-Abo zurueck', async () => {
    mockRequireAuth.mockResolvedValue({ supabase: { from: vi.fn() }, user: { id: 'u1' } });
    mockRequireSubscription.mockResolvedValue(
      NextResponse.json({ error: 'Plus-Abo erforderlich' }, { status: 403 })
    );
    const { GET } = await import('@/app/api/care/medications/log/route');
    const req = new NextRequest('http://localhost/api/care/medications/log');
    const res = await GET(req);
    expect(res.status).toBe(403);
  });
});
