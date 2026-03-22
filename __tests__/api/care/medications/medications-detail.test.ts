// __tests__/api/care/medications/medications-detail.test.ts
// Sicherheitskritisch: Einzelnes Medikament lesen, aktualisieren, deaktivieren

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

vi.mock('@/lib/care/field-encryption', () => ({
  encryptFields: vi.fn((obj: Record<string, unknown>) => obj),
  decryptFields: vi.fn((obj: Record<string, unknown>) => obj),
  CARE_MEDICATIONS_ENCRYPTED_FIELDS: ['name', 'dosage', 'instructions'],
}));

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

describe('GET /api/care/medications/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('gibt einzelnes Medikament zurueck (200)', async () => {
    const med = { id: 'm1', name: 'Aspirin', dosage: '100mg', senior_id: 'u1' };
    const chain = createChain(med);
    const mockSupabase = { from: vi.fn().mockReturnValue(chain) };
    mockRequireAuth.mockResolvedValue({ supabase: mockSupabase, user: { id: 'u1' } });
    mockRequireSubscription.mockResolvedValue(true);

    const { GET } = await import('@/app/api/care/medications/[id]/route');
    const req = new NextRequest('http://localhost/api/care/medications/m1');
    const res = await GET(req, { params: Promise.resolve({ id: 'm1' }) });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.name).toBe('Aspirin');
  });

  it('gibt 404 bei nicht existierendem Medikament zurueck', async () => {
    const chain = createChain(null, { code: 'PGRST116', message: 'not found' });
    const mockSupabase = { from: vi.fn().mockReturnValue(chain) };
    mockRequireAuth.mockResolvedValue({ supabase: mockSupabase, user: { id: 'u1' } });
    mockRequireSubscription.mockResolvedValue(true);

    const { GET } = await import('@/app/api/care/medications/[id]/route');
    const req = new NextRequest('http://localhost/api/care/medications/invalid');
    const res = await GET(req, { params: Promise.resolve({ id: 'invalid' }) });
    expect(res.status).toBe(404);
  });

  it('gibt 401 ohne Authentifizierung zurueck', async () => {
    mockRequireAuth.mockResolvedValue(null);
    const { GET } = await import('@/app/api/care/medications/[id]/route');
    const req = new NextRequest('http://localhost/api/care/medications/m1');
    const res = await GET(req, { params: Promise.resolve({ id: 'm1' }) });
    expect(res.status).toBe(401);
  });

  it('gibt 403 bei fremdem Senior zurueck', async () => {
    const med = { id: 'm1', name: 'Aspirin', senior_id: 'other-user' };
    const chain = createChain(med);
    const mockSupabase = { from: vi.fn().mockReturnValue(chain) };
    mockRequireAuth.mockResolvedValue({ supabase: mockSupabase, user: { id: 'u1' } });
    mockRequireSubscription.mockResolvedValue(true);
    mockRequireCareAccess.mockResolvedValue(null);

    const { GET } = await import('@/app/api/care/medications/[id]/route');
    const req = new NextRequest('http://localhost/api/care/medications/m1');
    const res = await GET(req, { params: Promise.resolve({ id: 'm1' }) });
    expect(res.status).toBe(403);
  });
});

describe('PATCH /api/care/medications/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('aktualisiert Medikament (200)', async () => {
    const updated = { id: 'm1', name: 'Aspirin forte', senior_id: 'u1' };
    const chain = createChain(updated);
    const mockSupabase = { from: vi.fn().mockReturnValue(chain) };
    mockRequireAuth.mockResolvedValue({ supabase: mockSupabase, user: { id: 'u1' } });
    mockRequireSubscription.mockResolvedValue(true);

    const { PATCH } = await import('@/app/api/care/medications/[id]/route');
    const req = new NextRequest('http://localhost/api/care/medications/m1', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'Aspirin forte' }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: 'm1' }) });
    expect(res.status).toBe(200);
  });

  it('lehnt ab ohne aenderbare Felder (400)', async () => {
    const mockSupabase = { from: vi.fn() };
    mockRequireAuth.mockResolvedValue({ supabase: mockSupabase, user: { id: 'u1' } });
    mockRequireSubscription.mockResolvedValue(true);

    const { PATCH } = await import('@/app/api/care/medications/[id]/route');
    const req = new NextRequest('http://localhost/api/care/medications/m1', {
      method: 'PATCH',
      body: JSON.stringify({ invalid_field: 'test' }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: 'm1' }) });
    expect(res.status).toBe(400);
  });

  it('lehnt ungueltiges JSON ab (400)', async () => {
    const mockSupabase = { from: vi.fn() };
    mockRequireAuth.mockResolvedValue({ supabase: mockSupabase, user: { id: 'u1' } });
    mockRequireSubscription.mockResolvedValue(true);

    const { PATCH } = await import('@/app/api/care/medications/[id]/route');
    const req = new NextRequest('http://localhost/api/care/medications/m1', {
      method: 'PATCH',
      body: 'not json',
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: 'm1' }) });
    expect(res.status).toBe(400);
  });

  it('gibt 401 ohne Authentifizierung zurueck', async () => {
    mockRequireAuth.mockResolvedValue(null);
    const { PATCH } = await import('@/app/api/care/medications/[id]/route');
    const req = new NextRequest('http://localhost/api/care/medications/m1', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'Test' }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: 'm1' }) });
    expect(res.status).toBe(401);
  });
});

describe('DELETE /api/care/medications/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('deaktiviert Medikament (soft delete)', async () => {
    const deactivated = { id: 'm1', active: false, senior_id: 'u1' };
    const chain = createChain(deactivated);
    const mockSupabase = { from: vi.fn().mockReturnValue(chain) };
    mockRequireAuth.mockResolvedValue({ supabase: mockSupabase, user: { id: 'u1' } });
    mockRequireSubscription.mockResolvedValue(true);

    const { DELETE } = await import('@/app/api/care/medications/[id]/route');
    const req = new NextRequest('http://localhost/api/care/medications/m1', { method: 'DELETE' });
    const res = await DELETE(req, { params: Promise.resolve({ id: 'm1' }) });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
  });

  it('gibt 404 bei nicht existierendem Medikament zurueck', async () => {
    const chain = createChain(null);
    const mockSupabase = { from: vi.fn().mockReturnValue(chain) };
    mockRequireAuth.mockResolvedValue({ supabase: mockSupabase, user: { id: 'u1' } });
    mockRequireSubscription.mockResolvedValue(true);

    const { DELETE } = await import('@/app/api/care/medications/[id]/route');
    const req = new NextRequest('http://localhost/api/care/medications/invalid', { method: 'DELETE' });
    const res = await DELETE(req, { params: Promise.resolve({ id: 'invalid' }) });
    expect(res.status).toBe(404);
  });

  it('gibt 401 ohne Authentifizierung zurueck', async () => {
    mockRequireAuth.mockResolvedValue(null);
    const { DELETE } = await import('@/app/api/care/medications/[id]/route');
    const req = new NextRequest('http://localhost/api/care/medications/m1', { method: 'DELETE' });
    const res = await DELETE(req, { params: Promise.resolve({ id: 'm1' }) });
    expect(res.status).toBe(401);
  });
});
