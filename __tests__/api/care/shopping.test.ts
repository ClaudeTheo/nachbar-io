// __tests__/api/care/shopping.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

// Mocks
const mockRequireAuth = vi.fn();
const mockRequireSubscription = vi.fn();

vi.mock('@/lib/care/api-helpers', () => ({
  requireAuth: (...args: any[]) => mockRequireAuth(...args),
  requireSubscription: (...args: any[]) => mockRequireSubscription(...args),
  unauthorizedResponse: () => NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 }),
}));

vi.mock('@/lib/care/audit', () => ({
  writeAuditLog: vi.fn().mockResolvedValue(undefined),
}));

describe('GET /api/care/shopping', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('gibt 401 ohne Authentifizierung zurueck', async () => {
    mockRequireAuth.mockResolvedValue(null);

    const { GET } = await import('@/app/api/care/shopping/route');
    const req = new NextRequest('http://localhost/api/care/shopping');
    const res = await GET(req as any);
    expect(res.status).toBe(401);
  });

  it('gibt 403 bei fehlendem Plus-Abo zurueck', async () => {
    const mockSupabase = { from: vi.fn() };
    mockRequireAuth.mockResolvedValue({ supabase: mockSupabase, user: { id: 'u1' } });
    mockRequireSubscription.mockResolvedValue(
      NextResponse.json({ error: 'Plus-Abo erforderlich' }, { status: 403 })
    );

    const { GET } = await import('@/app/api/care/shopping/route');
    const req = new NextRequest('http://localhost/api/care/shopping');
    const res = await GET(req as any);
    expect(res.status).toBe(403);
  });

  it('gibt Einkaufsanfragen zurueck', async () => {
    const mockData = [
      { id: 's1', items: ['Milch', 'Brot'], status: 'open' },
    ];
    // Universeller chainable Mock
    const chain: any = {};
    chain.select = vi.fn().mockReturnValue(chain);
    chain.eq = vi.fn().mockReturnValue(chain);
    chain.order = vi.fn().mockReturnValue(chain);
    chain.limit = vi.fn().mockReturnValue(chain);
    chain.then = (resolve: any) => resolve({ data: mockData, error: null });

    const mockSupabase = { from: vi.fn().mockReturnValue(chain) };
    mockRequireAuth.mockResolvedValue({ supabase: mockSupabase, user: { id: 'u1' } });
    mockRequireSubscription.mockResolvedValue(true);

    const { GET } = await import('@/app/api/care/shopping/route');
    const req = new NextRequest('http://localhost/api/care/shopping');
    const res = await GET(req as any);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(1);
  });
});

describe('POST /api/care/shopping', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('gibt 401 ohne Authentifizierung zurueck', async () => {
    mockRequireAuth.mockResolvedValue(null);

    const { POST } = await import('@/app/api/care/shopping/route');
    const req = new NextRequest('http://localhost/api/care/shopping', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: ['Milch'] }),
    });
    const res = await POST(req as any);
    expect(res.status).toBe(401);
  });
});
