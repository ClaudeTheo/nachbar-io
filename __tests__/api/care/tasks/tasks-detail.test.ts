// __tests__/api/care/tasks/tasks-detail.test.ts
// Aufgabentafel: Status-Uebergaenge und Loeschen

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

describe('PATCH /api/care/tasks/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('uebernimmt offene Aufgabe (claim)', async () => {
    const task = { id: 't1', status: 'open', creator_id: 'senior-1', claimed_by: null, title: 'Einkaufen' };
    const updated = { ...task, status: 'claimed', claimed_by: 'u1' };
    let callCount = 0;
    const mockSupabase = {
      from: vi.fn(() => {
        callCount++;
        if (callCount === 1) return createChain(task); // select existing
        return createChain(updated); // update
      }),
    };
    mockRequireAuth.mockResolvedValue({ supabase: mockSupabase, user: { id: 'u1' } });
    mockRequireSubscription.mockResolvedValue(true);

    const { PATCH } = await import('@/app/api/care/tasks/[id]/route');
    const req = new NextRequest('http://localhost/api/care/tasks/t1', {
      method: 'PATCH',
      body: JSON.stringify({ action: 'claim' }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: 't1' }) });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe('claimed');
  });

  it('lehnt ungueltige Aktion ab (400)', async () => {
    mockRequireAuth.mockResolvedValue({ supabase: { from: vi.fn() }, user: { id: 'u1' } });
    mockRequireSubscription.mockResolvedValue(true);

    const { PATCH } = await import('@/app/api/care/tasks/[id]/route');
    const req = new NextRequest('http://localhost/api/care/tasks/t1', {
      method: 'PATCH',
      body: JSON.stringify({ action: 'hack' }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: 't1' }) });
    expect(res.status).toBe(400);
  });

  it('lehnt Aktion im falschen Status ab (409)', async () => {
    const task = { id: 't1', status: 'done', creator_id: 'senior-1', claimed_by: 'u1' };
    const mockSupabase = { from: vi.fn().mockReturnValue(createChain(task)) };
    mockRequireAuth.mockResolvedValue({ supabase: mockSupabase, user: { id: 'u1' } });
    mockRequireSubscription.mockResolvedValue(true);

    const { PATCH } = await import('@/app/api/care/tasks/[id]/route');
    const req = new NextRequest('http://localhost/api/care/tasks/t1', {
      method: 'PATCH',
      body: JSON.stringify({ action: 'claim' }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: 't1' }) });
    expect(res.status).toBe(409);
  });

  it('lehnt confirm von Nicht-Ersteller ab (403)', async () => {
    const task = { id: 't1', status: 'done', creator_id: 'senior-1', claimed_by: 'u1' };
    const mockSupabase = { from: vi.fn().mockReturnValue(createChain(task)) };
    mockRequireAuth.mockResolvedValue({ supabase: mockSupabase, user: { id: 'u1' } });
    mockRequireSubscription.mockResolvedValue(true);

    const { PATCH } = await import('@/app/api/care/tasks/[id]/route');
    const req = new NextRequest('http://localhost/api/care/tasks/t1', {
      method: 'PATCH',
      body: JSON.stringify({ action: 'confirm' }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: 't1' }) });
    expect(res.status).toBe(403);
  });

  it('lehnt complete von Nicht-Claimer ab (403)', async () => {
    const task = { id: 't1', status: 'claimed', creator_id: 'senior-1', claimed_by: 'helper-1' };
    const mockSupabase = { from: vi.fn().mockReturnValue(createChain(task)) };
    mockRequireAuth.mockResolvedValue({ supabase: mockSupabase, user: { id: 'u1' } });
    mockRequireSubscription.mockResolvedValue(true);

    const { PATCH } = await import('@/app/api/care/tasks/[id]/route');
    const req = new NextRequest('http://localhost/api/care/tasks/t1', {
      method: 'PATCH',
      body: JSON.stringify({ action: 'complete' }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: 't1' }) });
    expect(res.status).toBe(403);
  });

  it('gibt 404 bei nicht existierender Aufgabe zurueck', async () => {
    const mockSupabase = {
      from: vi.fn().mockReturnValue(createChain(null, { code: 'PGRST116' })),
    };
    mockRequireAuth.mockResolvedValue({ supabase: mockSupabase, user: { id: 'u1' } });
    mockRequireSubscription.mockResolvedValue(true);

    const { PATCH } = await import('@/app/api/care/tasks/[id]/route');
    const req = new NextRequest('http://localhost/api/care/tasks/invalid', {
      method: 'PATCH',
      body: JSON.stringify({ action: 'claim' }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: 'invalid' }) });
    expect(res.status).toBe(404);
  });

  it('lehnt ungueltiges JSON ab (400)', async () => {
    mockRequireAuth.mockResolvedValue({ supabase: { from: vi.fn() }, user: { id: 'u1' } });
    mockRequireSubscription.mockResolvedValue(true);

    const { PATCH } = await import('@/app/api/care/tasks/[id]/route');
    const req = new NextRequest('http://localhost/api/care/tasks/t1', {
      method: 'PATCH',
      body: 'not json',
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: 't1' }) });
    expect(res.status).toBe(400);
  });

  it('gibt 401 ohne Authentifizierung zurueck', async () => {
    mockRequireAuth.mockResolvedValue(null);
    const { PATCH } = await import('@/app/api/care/tasks/[id]/route');
    const req = new NextRequest('http://localhost/api/care/tasks/t1', {
      method: 'PATCH',
      body: JSON.stringify({ action: 'claim' }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: 't1' }) });
    expect(res.status).toBe(401);
  });
});

describe('DELETE /api/care/tasks/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('loescht offene Aufgabe erfolgreich', async () => {
    const task = { creator_id: 'u1', status: 'open', title: 'Einkaufen' };
    const chain = createChain(task);
    const mockSupabase = { from: vi.fn().mockReturnValue(chain) };
    mockRequireAuth.mockResolvedValue({ supabase: mockSupabase, user: { id: 'u1' } });
    mockRequireSubscription.mockResolvedValue(true);

    const { DELETE } = await import('@/app/api/care/tasks/[id]/route');
    const req = new NextRequest('http://localhost/api/care/tasks/t1', { method: 'DELETE' });
    const res = await DELETE(req, { params: Promise.resolve({ id: 't1' }) });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
  });

  it('lehnt Loeschen von Nicht-Ersteller ab (403)', async () => {
    const task = { creator_id: 'other-user', status: 'open', title: 'Einkaufen' };
    const mockSupabase = { from: vi.fn().mockReturnValue(createChain(task)) };
    mockRequireAuth.mockResolvedValue({ supabase: mockSupabase, user: { id: 'u1' } });
    mockRequireSubscription.mockResolvedValue(true);

    const { DELETE } = await import('@/app/api/care/tasks/[id]/route');
    const req = new NextRequest('http://localhost/api/care/tasks/t1', { method: 'DELETE' });
    const res = await DELETE(req, { params: Promise.resolve({ id: 't1' }) });
    expect(res.status).toBe(403);
  });

  it('lehnt Loeschen nicht-offener Aufgabe ab (409)', async () => {
    const task = { creator_id: 'u1', status: 'claimed', title: 'Einkaufen' };
    const mockSupabase = { from: vi.fn().mockReturnValue(createChain(task)) };
    mockRequireAuth.mockResolvedValue({ supabase: mockSupabase, user: { id: 'u1' } });
    mockRequireSubscription.mockResolvedValue(true);

    const { DELETE } = await import('@/app/api/care/tasks/[id]/route');
    const req = new NextRequest('http://localhost/api/care/tasks/t1', { method: 'DELETE' });
    const res = await DELETE(req, { params: Promise.resolve({ id: 't1' }) });
    expect(res.status).toBe(409);
  });

  it('gibt 401 ohne Authentifizierung zurueck', async () => {
    mockRequireAuth.mockResolvedValue(null);
    const { DELETE } = await import('@/app/api/care/tasks/[id]/route');
    const req = new NextRequest('http://localhost/api/care/tasks/t1', { method: 'DELETE' });
    const res = await DELETE(req, { params: Promise.resolve({ id: 't1' }) });
    expect(res.status).toBe(401);
  });
});
