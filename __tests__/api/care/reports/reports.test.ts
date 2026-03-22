// __tests__/api/care/reports/reports.test.ts
// Berichte-API: Liste und Generierung

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextResponse } from 'next/server';

const mockRequireAuth = vi.fn();
const mockRequireSubscription = vi.fn();
const mockRequireFeature = vi.fn();
const mockRequireCareAccess = vi.fn();

vi.mock('@/lib/care/api-helpers', () => ({
  requireAuth: (...args: unknown[]) => mockRequireAuth(...args),
  requireSubscription: (...args: unknown[]) => mockRequireSubscription(...args),
  requireFeature: (...args: unknown[]) => mockRequireFeature(...args),
  requireCareAccess: (...args: unknown[]) => mockRequireCareAccess(...args),
  errorResponse: (msg: string, status: number) => NextResponse.json({ error: msg }, { status }),
  successResponse: (data: unknown, status = 200) => NextResponse.json(data, { status }),
  careLog: vi.fn(),
}));

vi.mock('@/lib/care/audit', () => ({ writeAuditLog: vi.fn().mockResolvedValue(undefined) }));
vi.mock('@/lib/care/reports/generator', () => ({
  generateReportData: vi.fn().mockResolvedValue({ summary: 'test report data' }),
}));

function createChain(resolveData: unknown = [], resolveError: unknown = null) {
  const chain: Record<string, unknown> = {};
  chain.select = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.order = vi.fn().mockReturnValue(chain);
  chain.limit = vi.fn().mockReturnValue(chain);
  chain.single = vi.fn().mockResolvedValue({ data: resolveData, error: resolveError });
  chain.insert = vi.fn().mockReturnValue(chain);
  chain.then = (resolve: (v: { data: unknown; error: unknown }) => void) =>
    resolve({ data: resolveData, error: resolveError });
  return chain;
}

describe('GET /api/care/reports', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('gibt 401 ohne Authentifizierung zurueck', async () => {
    mockRequireAuth.mockResolvedValue(null);
    const { GET } = await import('@/app/api/care/reports/route');
    const req = new Request('http://localhost/api/care/reports');
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('gibt 403 bei fehlendem Plus-Abo zurueck', async () => {
    mockRequireAuth.mockResolvedValue({ supabase: { from: vi.fn() }, user: { id: 'u1' } });
    mockRequireSubscription.mockResolvedValue(
      NextResponse.json({ error: 'Plus-Abo erforderlich' }, { status: 403 })
    );
    const { GET } = await import('@/app/api/care/reports/route');
    const req = new Request('http://localhost/api/care/reports');
    const res = await GET(req);
    expect(res.status).toBe(403);
  });

  it('gibt 403 bei fehlendem Feature-Gate zurueck', async () => {
    const mockSupabase = { from: vi.fn().mockReturnValue(createChain()) };
    mockRequireAuth.mockResolvedValue({ supabase: mockSupabase, user: { id: 'u1' } });
    mockRequireSubscription.mockResolvedValue(true);
    mockRequireFeature.mockResolvedValue(false);

    const { GET } = await import('@/app/api/care/reports/route');
    const req = new Request('http://localhost/api/care/reports');
    const res = await GET(req);
    expect(res.status).toBe(403);
  });

  it('gibt Berichte zurueck (200)', async () => {
    const docs = [{ id: 'd1', title: 'Wochenbericht', type: 'care_report_weekly' }];
    const mockSupabase = { from: vi.fn().mockReturnValue(createChain(docs)) };
    mockRequireAuth.mockResolvedValue({ supabase: mockSupabase, user: { id: 'u1' } });
    mockRequireSubscription.mockResolvedValue(true);
    mockRequireFeature.mockResolvedValue(true);

    const { GET } = await import('@/app/api/care/reports/route');
    const req = new Request('http://localhost/api/care/reports');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveLength(1);
  });
});

describe('POST /api/care/reports', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('generiert neuen Bericht (201)', async () => {
    const doc = { id: 'd2', title: 'Tagesbericht', type: 'care_report_daily' };
    const chain = createChain(doc);
    const mockSupabase = { from: vi.fn().mockReturnValue(chain) };
    mockRequireAuth.mockResolvedValue({ supabase: mockSupabase, user: { id: 'u1' } });
    mockRequireSubscription.mockResolvedValue(true);
    mockRequireFeature.mockResolvedValue(true);

    const { POST } = await import('@/app/api/care/reports/route');
    const req = new Request('http://localhost/api/care/reports', {
      method: 'POST',
      body: JSON.stringify({
        type: 'care_report_daily',
        period_start: '2026-03-01',
        period_end: '2026-03-07',
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
  });

  it('lehnt ungueltigen Berichtstyp ab (400)', async () => {
    mockRequireAuth.mockResolvedValue({ supabase: { from: vi.fn() }, user: { id: 'u1' } });
    mockRequireSubscription.mockResolvedValue(true);

    const { POST } = await import('@/app/api/care/reports/route');
    const req = new Request('http://localhost/api/care/reports', {
      method: 'POST',
      body: JSON.stringify({ type: 'invalid_type', period_start: '2026-03-01', period_end: '2026-03-07' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('lehnt ab ohne Zeitraum (400)', async () => {
    mockRequireAuth.mockResolvedValue({ supabase: { from: vi.fn() }, user: { id: 'u1' } });
    mockRequireSubscription.mockResolvedValue(true);

    const { POST } = await import('@/app/api/care/reports/route');
    const req = new Request('http://localhost/api/care/reports', {
      method: 'POST',
      body: JSON.stringify({ type: 'care_report_daily' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('lehnt ungueltiges JSON ab (400)', async () => {
    mockRequireAuth.mockResolvedValue({ supabase: { from: vi.fn() }, user: { id: 'u1' } });
    mockRequireSubscription.mockResolvedValue(true);

    const { POST } = await import('@/app/api/care/reports/route');
    const req = new Request('http://localhost/api/care/reports', {
      method: 'POST',
      body: 'not json',
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
