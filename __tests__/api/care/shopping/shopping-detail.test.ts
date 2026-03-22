// __tests__/api/care/shopping/shopping-detail.test.ts
// Einkaufshilfe: Status-Uebergaenge und Loeschen

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

const mockRequireAuth = vi.fn();
const mockRequireSubscription = vi.fn();

vi.mock('@/lib/care/api-helpers', () => ({
  requireAuth: (...args: unknown[]) => mockRequireAuth(...args),
  requireSubscription: (...args: unknown[]) => mockRequireSubscription(...args),
  unauthorizedResponse: () => NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 }),
}));

vi.mock('@/lib/care/audit', () => ({ writeAuditLog: vi.fn().mockResolvedValue(undefined) }));
vi.mock('@/lib/care/notifications', () => ({ sendCareNotification: vi.fn().mockResolvedValue(undefined) }));

function createChain(resolveData: unknown = null, resolveError: unknown = null) {
  const chain: Record<string, unknown> = {};
  chain.select = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.single = vi.fn().mockResolvedValue({ data: resolveData, error: resolveError });
  chain.insert = vi.fn().mockReturnValue(chain);
  chain.update = vi.fn().mockReturnValue(chain);
  chain.delete = vi.fn().mockReturnValue(chain);
  chain.then = (resolve: (v: { data: unknown; error: unknown }) => void) =>
    resolve({ data: resolveData, error: resolveError });
  return chain;
}

describe('PATCH /api/care/shopping/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('uebernimmt offene Anfrage (claim)', async () => {
    const existing = { id: 'sh-1', status: 'open', requester_id: 'senior-1', claimed_by: null };
    const updated = { ...existing, status: 'claimed', claimed_by: 'u1' };
    let callCount = 0;
    const mockSupabase = {
      from: vi.fn(() => {
        callCount++;
        if (callCount === 1) return createChain(existing); // select existing
        return createChain(updated); // update
      }),
    };
    mockRequireAuth.mockResolvedValue({ supabase: mockSupabase, user: { id: 'u1' } });
    mockRequireSubscription.mockResolvedValue(true);

    const { PATCH } = await import('@/app/api/care/shopping/[id]/route');
    const req = new NextRequest('http://localhost/api/care/shopping/sh-1', {
      method: 'PATCH',
      body: JSON.stringify({ action: 'claim' }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: 'sh-1' }) });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe('claimed');
  });

  it('lehnt ungueltige Aktion ab (400)', async () => {
    const existing = { id: 'sh-1', status: 'open', requester_id: 'u1' };
    const mockSupabase = { from: vi.fn().mockReturnValue(createChain(existing)) };
    mockRequireAuth.mockResolvedValue({ supabase: mockSupabase, user: { id: 'u1' } });
    mockRequireSubscription.mockResolvedValue(true);

    const { PATCH } = await import('@/app/api/care/shopping/[id]/route');
    const req = new NextRequest('http://localhost/api/care/shopping/sh-1', {
      method: 'PATCH',
      body: JSON.stringify({ action: 'hack' }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: 'sh-1' }) });
    expect(res.status).toBe(400);
  });

  it('lehnt Aktion im falschen Status ab (409)', async () => {
    const existing = { id: 'sh-1', status: 'delivered', requester_id: 'u1' };
    const mockSupabase = { from: vi.fn().mockReturnValue(createChain(existing)) };
    mockRequireAuth.mockResolvedValue({ supabase: mockSupabase, user: { id: 'u1' } });
    mockRequireSubscription.mockResolvedValue(true);

    const { PATCH } = await import('@/app/api/care/shopping/[id]/route');
    const req = new NextRequest('http://localhost/api/care/shopping/sh-1', {
      method: 'PATCH',
      body: JSON.stringify({ action: 'claim' }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: 'sh-1' }) });
    expect(res.status).toBe(409);
  });

  it('lehnt confirm von Nicht-Ersteller ab (403)', async () => {
    const existing = { id: 'sh-1', status: 'delivered', requester_id: 'senior-1', claimed_by: 'helper-1' };
    const mockSupabase = { from: vi.fn().mockReturnValue(createChain(existing)) };
    mockRequireAuth.mockResolvedValue({ supabase: mockSupabase, user: { id: 'helper-1' } });
    mockRequireSubscription.mockResolvedValue(true);

    const { PATCH } = await import('@/app/api/care/shopping/[id]/route');
    const req = new NextRequest('http://localhost/api/care/shopping/sh-1', {
      method: 'PATCH',
      body: JSON.stringify({ action: 'confirm' }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: 'sh-1' }) });
    expect(res.status).toBe(403);
  });

  it('gibt 404 bei nicht existierender Anfrage zurueck', async () => {
    const mockSupabase = {
      from: vi.fn().mockReturnValue(createChain(null, { code: 'PGRST116' })),
    };
    mockRequireAuth.mockResolvedValue({ supabase: mockSupabase, user: { id: 'u1' } });
    mockRequireSubscription.mockResolvedValue(true);

    const { PATCH } = await import('@/app/api/care/shopping/[id]/route');
    const req = new NextRequest('http://localhost/api/care/shopping/invalid', {
      method: 'PATCH',
      body: JSON.stringify({ action: 'claim' }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: 'invalid' }) });
    expect(res.status).toBe(404);
  });

  it('lehnt ungueltiges JSON ab (400)', async () => {
    mockRequireAuth.mockResolvedValue({ supabase: { from: vi.fn() }, user: { id: 'u1' } });
    mockRequireSubscription.mockResolvedValue(true);

    const { PATCH } = await import('@/app/api/care/shopping/[id]/route');
    const req = new NextRequest('http://localhost/api/care/shopping/sh-1', {
      method: 'PATCH',
      body: 'not json',
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: 'sh-1' }) });
    expect(res.status).toBe(400);
  });

  it('gibt 401 ohne Authentifizierung zurueck', async () => {
    mockRequireAuth.mockResolvedValue(null);
    const { PATCH } = await import('@/app/api/care/shopping/[id]/route');
    const req = new NextRequest('http://localhost/api/care/shopping/sh-1', {
      method: 'PATCH',
      body: JSON.stringify({ action: 'claim' }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: 'sh-1' }) });
    expect(res.status).toBe(401);
  });
});

describe('DELETE /api/care/shopping/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('loescht offene Anfrage erfolgreich', async () => {
    const existing = { requester_id: 'u1', status: 'open' };
    const chain = createChain(existing);
    const mockSupabase = { from: vi.fn().mockReturnValue(chain) };
    mockRequireAuth.mockResolvedValue({ supabase: mockSupabase, user: { id: 'u1' } });
    mockRequireSubscription.mockResolvedValue(true);

    const { DELETE } = await import('@/app/api/care/shopping/[id]/route');
    const req = new NextRequest('http://localhost/api/care/shopping/sh-1', { method: 'DELETE' });
    const res = await DELETE(req, { params: Promise.resolve({ id: 'sh-1' }) });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
  });

  it('lehnt Loeschen von Nicht-Ersteller ab (403)', async () => {
    const existing = { requester_id: 'other-user', status: 'open' };
    const mockSupabase = { from: vi.fn().mockReturnValue(createChain(existing)) };
    mockRequireAuth.mockResolvedValue({ supabase: mockSupabase, user: { id: 'u1' } });
    mockRequireSubscription.mockResolvedValue(true);

    const { DELETE } = await import('@/app/api/care/shopping/[id]/route');
    const req = new NextRequest('http://localhost/api/care/shopping/sh-1', { method: 'DELETE' });
    const res = await DELETE(req, { params: Promise.resolve({ id: 'sh-1' }) });
    expect(res.status).toBe(403);
  });

  it('lehnt Loeschen nicht-offener Anfrage ab (409)', async () => {
    const existing = { requester_id: 'u1', status: 'claimed' };
    const mockSupabase = { from: vi.fn().mockReturnValue(createChain(existing)) };
    mockRequireAuth.mockResolvedValue({ supabase: mockSupabase, user: { id: 'u1' } });
    mockRequireSubscription.mockResolvedValue(true);

    const { DELETE } = await import('@/app/api/care/shopping/[id]/route');
    const req = new NextRequest('http://localhost/api/care/shopping/sh-1', { method: 'DELETE' });
    const res = await DELETE(req, { params: Promise.resolve({ id: 'sh-1' }) });
    expect(res.status).toBe(409);
  });

  it('gibt 401 ohne Authentifizierung zurueck', async () => {
    mockRequireAuth.mockResolvedValue(null);
    const { DELETE } = await import('@/app/api/care/shopping/[id]/route');
    const req = new NextRequest('http://localhost/api/care/shopping/sh-1', { method: 'DELETE' });
    const res = await DELETE(req, { params: Promise.resolve({ id: 'sh-1' }) });
    expect(res.status).toBe(401);
  });
});
