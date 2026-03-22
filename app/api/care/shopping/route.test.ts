// app/api/care/shopping/route.test.ts
// Nachbar.io — Tests fuer Einkaufshilfe API-Route (GET + POST)
// Testet: Auth, Subscription-Gate, Validierung, Artikellimits, Quartier-Zuordnung

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

const mockUser = { id: 'user-1', email: 'test@test.de' };
const mockRequireAuth = vi.fn();
const mockRequireSubscription = vi.fn();

vi.mock('@/lib/care/api-helpers', () => ({
  requireAuth: (...args: unknown[]) => mockRequireAuth(...args),
  requireSubscription: (...args: unknown[]) => mockRequireSubscription(...args),
  unauthorizedResponse: () => NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 }),
}));

vi.mock('@/lib/care/audit', () => ({
  writeAuditLog: vi.fn().mockResolvedValue(undefined),
}));

// Proxy-basierter Supabase-Mock
function createChainProxy(resolveValue: { data: unknown; error: unknown }): unknown {
  const handler: ProxyHandler<Record<string, unknown>> = {
    get(_target, prop: string) {
      if (prop === 'then') {
        return (resolve: (v: unknown) => void, reject?: (e: unknown) => void) =>
          Promise.resolve(resolveValue).then(resolve, reject);
      }
      if (prop === 'single') return () => Promise.resolve(resolveValue);
      return () => new Proxy({}, handler);
    },
  };
  return new Proxy({}, handler);
}

const mockShoppingItems = [
  { id: 's-1', items: [{ name: 'Milch', quantity: '1L' }], status: 'open' },
];

const mockHouseholdResult = { data: { household: { quarter_id: 'q-1' } }, error: null };
const mockInsertResult = { data: { id: 's-new', items: [{ name: 'Brot' }], status: 'open' }, error: null };

const mockFrom = vi.fn().mockImplementation((table: string) => {
  if (table === 'care_shopping_requests') {
    return {
      select: () => createChainProxy({ data: mockShoppingItems, error: null }),
      insert: () => ({ select: () => ({ single: vi.fn().mockResolvedValue(mockInsertResult) }) }),
    };
  }
  if (table === 'household_members') {
    return { select: () => createChainProxy(mockHouseholdResult) };
  }
  return { select: () => createChainProxy({ data: null, error: null }) };
});

const mockSupabase = { from: mockFrom, auth: { getUser: vi.fn() } };

import { GET, POST } from './route';

// Helpers
function createGetRequest(params: Record<string, string> = {}): NextRequest {
  const url = new URL('http://localhost:3000/api/care/shopping');
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new NextRequest(url);
}

function createPostRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost:3000/api/care/shopping', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('GET /api/care/shopping', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAuth.mockResolvedValue({ supabase: mockSupabase, user: mockUser });
    mockRequireSubscription.mockResolvedValue(true);
  });

  it('gibt 401 wenn nicht authentifiziert', async () => {
    mockRequireAuth.mockResolvedValue(null);
    const res = await GET(createGetRequest());
    expect(res.status).toBe(401);
  });

  it('prueft Subscription-Gate (Plus erforderlich)', async () => {
    mockRequireSubscription.mockResolvedValue(
      NextResponse.json({ error: 'Plus erforderlich' }, { status: 403 }),
    );
    const res = await GET(createGetRequest());
    expect(res.status).toBe(403);
  });

  it('laedt Einkaufsanfragen', async () => {
    const res = await GET(createGetRequest());
    expect(res.status).toBe(200);
  });
});

describe('POST /api/care/shopping', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAuth.mockResolvedValue({ supabase: mockSupabase, user: mockUser });
    mockRequireSubscription.mockResolvedValue(true);
  });

  it('gibt 401 wenn nicht authentifiziert', async () => {
    mockRequireAuth.mockResolvedValue(null);
    const res = await POST(createPostRequest({ items: [{ name: 'Milch' }] }));
    expect(res.status).toBe(401);
  });

  it('weist leere items-Liste ab', async () => {
    const res = await POST(createPostRequest({ items: [] }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('mindestens einen Artikel');
  });

  it('weist fehlendes items-Array ab', async () => {
    const res = await POST(createPostRequest({ note: 'Ohne Artikel' }));
    expect(res.status).toBe(400);
  });

  it('weist mehr als 30 Artikel ab', async () => {
    const items = Array.from({ length: 31 }, (_, i) => ({ name: `Artikel ${i}` }));
    const res = await POST(createPostRequest({ items }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('30 Artikel');
  });

  it('weist Artikel ohne Namen ab', async () => {
    const res = await POST(createPostRequest({ items: [{ name: '' }] }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('Namen');
  });

  it('weist zu langen Artikelnamen ab (> 200 Zeichen)', async () => {
    const res = await POST(createPostRequest({ items: [{ name: 'A'.repeat(201) }] }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('200 Zeichen');
  });

  it('weist zu lange Notiz ab (> 500 Zeichen)', async () => {
    const res = await POST(createPostRequest({
      items: [{ name: 'Milch' }],
      note: 'N'.repeat(501),
    }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('500 Zeichen');
  });

  it('erstellt Einkaufsanfrage mit gueltigen Daten', async () => {
    const res = await POST(createPostRequest({
      items: [{ name: 'Milch', quantity: '1L' }, { name: 'Brot' }],
      note: 'Bitte Vollkorn',
    }));
    expect(res.status).toBe(201);
  });

  it('weist ungueltiges JSON ab', async () => {
    const req = new NextRequest('http://localhost:3000/api/care/shopping', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'kein-json',
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
