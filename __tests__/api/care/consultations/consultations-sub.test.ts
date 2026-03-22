// __tests__/api/care/consultations/consultations-sub.test.ts
// Online-Sprechstunde: Consent, Terminverhandlung, Host-Status

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

const mockRequireAuth = vi.fn();
const mockRequireSubscription = vi.fn();

vi.mock('@/lib/care/api-helpers', () => ({
  requireAuth: (...args: unknown[]) => mockRequireAuth(...args),
  requireSubscription: (...args: unknown[]) => mockRequireSubscription(...args),
  unauthorizedResponse: () => NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 }),
}));

vi.mock('@/lib/care/logger', () => ({
  createCareLogger: vi.fn(() => ({
    info: vi.fn(), warn: vi.fn(), error: vi.fn(), done: vi.fn(),
  })),
}));

vi.mock('@/lib/care/field-encryption', () => ({
  encryptField: vi.fn((v: string) => v),
}));

vi.mock('@/lib/consultation/appointment-status', () => ({
  canTransition: vi.fn().mockReturnValue(true),
}));

vi.mock('@/lib/consultation/notifications', () => ({
  sendAppointmentPush: vi.fn().mockResolvedValue(undefined),
  sendAppointmentEmail: vi.fn().mockResolvedValue(undefined),
}));

function createChain(resolveData: unknown = null, resolveError: unknown = null) {
  const chain: Record<string, unknown> = {};
  chain.select = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.maybeSingle = vi.fn().mockResolvedValue({ data: resolveData, error: resolveError });
  chain.single = vi.fn().mockResolvedValue({ data: resolveData, error: resolveError });
  chain.upsert = vi.fn().mockReturnValue(chain);
  chain.update = vi.fn().mockReturnValue(chain);
  chain.then = (resolve: (v: { data: unknown; error: unknown }) => void) =>
    resolve({ data: resolveData, error: resolveError });
  return chain;
}

// --- Consent Route Tests ---
describe('GET /api/care/consultations/consent', () => {
  beforeEach(() => { vi.clearAllMocks(); vi.resetModules(); });

  it('gibt 401 ohne Auth zurueck', async () => {
    mockRequireAuth.mockResolvedValue(null);
    const { GET } = await import('@/app/api/care/consultations/consent/route');
    const req = new NextRequest('http://localhost/api/care/consultations/consent');
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('gibt Consent-Status zurueck (200)', async () => {
    const consent = { id: 'c-1', consent_version: 'v1', consented_at: '2026-03-22T10:00:00Z' };
    const mockSupabase = { from: vi.fn().mockReturnValue(createChain(consent)) };
    mockRequireAuth.mockResolvedValue({ supabase: mockSupabase, user: { id: 'u1' } });
    mockRequireSubscription.mockResolvedValue(true);

    const { GET } = await import('@/app/api/care/consultations/consent/route');
    const req = new NextRequest('http://localhost/api/care/consultations/consent');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.consented).toBe(true);
  });
});

describe('POST /api/care/consultations/consent', () => {
  beforeEach(() => { vi.clearAllMocks(); vi.resetModules(); });

  it('erteilt Consent (201)', async () => {
    const consent = { id: 'c-1', user_id: 'u1', provider_type: 'community' };
    const mockSupabase = { from: vi.fn().mockReturnValue(createChain(consent)) };
    mockRequireAuth.mockResolvedValue({ supabase: mockSupabase, user: { id: 'u1' } });
    mockRequireSubscription.mockResolvedValue(true);

    const { POST } = await import('@/app/api/care/consultations/consent/route');
    const req = new NextRequest('http://localhost/api/care/consultations/consent', {
      method: 'POST',
      body: JSON.stringify({ provider_type: 'community' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
  });

  it('lehnt ungueltigen provider_type ab (400)', async () => {
    mockRequireAuth.mockResolvedValue({ supabase: { from: vi.fn() }, user: { id: 'u1' } });
    mockRequireSubscription.mockResolvedValue(true);

    const { POST } = await import('@/app/api/care/consultations/consent/route');
    const req = new NextRequest('http://localhost/api/care/consultations/consent', {
      method: 'POST',
      body: JSON.stringify({ provider_type: 'invalid' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('lehnt ungueltiges JSON ab (400)', async () => {
    mockRequireAuth.mockResolvedValue({ supabase: { from: vi.fn() }, user: { id: 'u1' } });
    mockRequireSubscription.mockResolvedValue(true);

    const { POST } = await import('@/app/api/care/consultations/consent/route');
    const req = new NextRequest('http://localhost/api/care/consultations/consent', {
      method: 'POST',
      body: 'not json',
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});

// --- Appointment Negotiation Tests ---
describe('PATCH /api/care/consultations/[id]', () => {
  beforeEach(() => { vi.clearAllMocks(); vi.resetModules(); });

  it('bestaetigt Termin (confirm)', async () => {
    const slot = { id: 's1', booked_by: 'u1', host_user_id: 'doc-1', status: 'proposed', scheduled_at: '2026-04-01T10:00:00Z' };
    let callCount = 0;
    const mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === 'consultation_slots') {
          callCount++;
          if (callCount === 1) return createChain(slot); // select
          return createChain(null, null); // update (returns no error)
        }
        if (table === 'users') return createChain({ display_name: 'Patient', email: 'test@test.de' });
        return createChain();
      }),
    };
    mockRequireAuth.mockResolvedValue({ supabase: mockSupabase, user: { id: 'u1' } });
    mockRequireSubscription.mockResolvedValue(true);

    const { PATCH } = await import('@/app/api/care/consultations/[id]/route');
    const req = new NextRequest('http://localhost/api/care/consultations/s1', {
      method: 'PATCH',
      body: JSON.stringify({ action: 'confirm' }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: 's1' }) });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe('confirmed');
  });

  it('lehnt ungueltige Aktion ab (400)', async () => {
    mockRequireAuth.mockResolvedValue({ supabase: { from: vi.fn() }, user: { id: 'u1' } });
    mockRequireSubscription.mockResolvedValue(true);

    const { PATCH } = await import('@/app/api/care/consultations/[id]/route');
    const req = new NextRequest('http://localhost/api/care/consultations/s1', {
      method: 'PATCH',
      body: JSON.stringify({ action: 'hack' }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: 's1' }) });
    expect(res.status).toBe(400);
  });

  it('lehnt Nicht-Patient ab (403)', async () => {
    const slot = { id: 's1', booked_by: 'other-user', host_user_id: 'doc-1', status: 'proposed' };
    const mockSupabase = { from: vi.fn().mockReturnValue(createChain(slot)) };
    mockRequireAuth.mockResolvedValue({ supabase: mockSupabase, user: { id: 'u1' } });
    mockRequireSubscription.mockResolvedValue(true);

    const { PATCH } = await import('@/app/api/care/consultations/[id]/route');
    const req = new NextRequest('http://localhost/api/care/consultations/s1', {
      method: 'PATCH',
      body: JSON.stringify({ action: 'confirm' }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: 's1' }) });
    expect(res.status).toBe(403);
  });

  it('gibt 404 bei nicht existierendem Termin zurueck', async () => {
    const mockSupabase = { from: vi.fn().mockReturnValue(createChain(null, { code: 'PGRST116' })) };
    mockRequireAuth.mockResolvedValue({ supabase: mockSupabase, user: { id: 'u1' } });
    mockRequireSubscription.mockResolvedValue(true);

    const { PATCH } = await import('@/app/api/care/consultations/[id]/route');
    const req = new NextRequest('http://localhost/api/care/consultations/invalid', {
      method: 'PATCH',
      body: JSON.stringify({ action: 'confirm' }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: 'invalid' }) });
    expect(res.status).toBe(404);
  });

  it('gibt 401 ohne Auth zurueck', async () => {
    mockRequireAuth.mockResolvedValue(null);
    const { PATCH } = await import('@/app/api/care/consultations/[id]/route');
    const req = new NextRequest('http://localhost/api/care/consultations/s1', {
      method: 'PATCH',
      body: JSON.stringify({ action: 'confirm' }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: 's1' }) });
    expect(res.status).toBe(401);
  });
});

// --- Host Status Tests ---
describe('PATCH /api/care/consultations/[id]/status', () => {
  beforeEach(() => { vi.clearAllMocks(); vi.resetModules(); });

  it('setzt Status auf active (200)', async () => {
    const slot = { id: 's1', host_user_id: 'u1', status: 'waiting', provider_type: 'community' };
    const updated = { ...slot, status: 'active' };
    let callCount = 0;
    const mockSupabase = {
      from: vi.fn(() => {
        callCount++;
        if (callCount === 1) return createChain(slot); // select
        return createChain(updated); // update
      }),
    };
    mockRequireAuth.mockResolvedValue({ supabase: mockSupabase, user: { id: 'u1' } });
    mockRequireSubscription.mockResolvedValue(true);

    const { PATCH } = await import('@/app/api/care/consultations/[id]/status/route');
    const req = new NextRequest('http://localhost/api/care/consultations/s1/status', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'active' }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: 's1' }) });
    expect(res.status).toBe(200);
  });

  it('lehnt ab ohne status-Feld (400)', async () => {
    mockRequireAuth.mockResolvedValue({ supabase: { from: vi.fn() }, user: { id: 'u1' } });
    mockRequireSubscription.mockResolvedValue(true);

    const { PATCH } = await import('@/app/api/care/consultations/[id]/status/route');
    const req = new NextRequest('http://localhost/api/care/consultations/s1/status', {
      method: 'PATCH',
      body: JSON.stringify({}),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: 's1' }) });
    expect(res.status).toBe(400);
  });

  it('lehnt Nicht-Host ab (403)', async () => {
    const slot = { id: 's1', host_user_id: 'other-user', status: 'waiting' };
    const mockSupabase = { from: vi.fn().mockReturnValue(createChain(slot)) };
    mockRequireAuth.mockResolvedValue({ supabase: mockSupabase, user: { id: 'u1' } });
    mockRequireSubscription.mockResolvedValue(true);

    const { PATCH } = await import('@/app/api/care/consultations/[id]/status/route');
    const req = new NextRequest('http://localhost/api/care/consultations/s1/status', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'active' }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: 's1' }) });
    expect(res.status).toBe(403);
  });

  it('lehnt ungueltigen Status-Uebergang ab (400)', async () => {
    const slot = { id: 's1', host_user_id: 'u1', status: 'scheduled' };
    const mockSupabase = { from: vi.fn().mockReturnValue(createChain(slot)) };
    mockRequireAuth.mockResolvedValue({ supabase: mockSupabase, user: { id: 'u1' } });
    mockRequireSubscription.mockResolvedValue(true);

    const { PATCH } = await import('@/app/api/care/consultations/[id]/status/route');
    const req = new NextRequest('http://localhost/api/care/consultations/s1/status', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'completed' }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: 's1' }) });
    expect(res.status).toBe(400);
  });

  it('gibt 404 bei nicht existierendem Slot zurueck', async () => {
    const mockSupabase = { from: vi.fn().mockReturnValue(createChain(null)) };
    mockRequireAuth.mockResolvedValue({ supabase: mockSupabase, user: { id: 'u1' } });
    mockRequireSubscription.mockResolvedValue(true);

    const { PATCH } = await import('@/app/api/care/consultations/[id]/status/route');
    const req = new NextRequest('http://localhost/api/care/consultations/invalid/status', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'active' }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: 'invalid' }) });
    expect(res.status).toBe(404);
  });

  it('gibt 401 ohne Auth zurueck', async () => {
    mockRequireAuth.mockResolvedValue(null);
    const { PATCH } = await import('@/app/api/care/consultations/[id]/status/route');
    const req = new NextRequest('http://localhost/api/care/consultations/s1/status', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'active' }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: 's1' }) });
    expect(res.status).toBe(401);
  });
});
