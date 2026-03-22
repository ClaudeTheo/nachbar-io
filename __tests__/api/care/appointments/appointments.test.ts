// __tests__/api/care/appointments/appointments.test.ts
// Sicherheitskritisch: Termine verwalten (CRUD)

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
  decryptFieldsArray: vi.fn((arr: Record<string, unknown>[]) => arr),
  CARE_APPOINTMENTS_ENCRYPTED_FIELDS: ['notes', 'location'],
}));

// Universeller chainable Supabase Mock
function createChain(resolveData: unknown = [], resolveError: unknown = null) {
  const chain: Record<string, unknown> = {};
  chain.select = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.gte = vi.fn().mockReturnValue(chain);
  chain.order = vi.fn().mockReturnValue(chain);
  chain.limit = vi.fn().mockReturnValue(chain);
  chain.single = vi.fn().mockResolvedValue({ data: resolveData, error: resolveError });
  chain.insert = vi.fn().mockReturnValue(chain);
  chain.update = vi.fn().mockReturnValue(chain);
  chain.delete = vi.fn().mockReturnValue(chain);
  // Thenable: damit await supabase.from(...).select(...).eq(...) funktioniert
  chain.then = (resolve: (v: { data: unknown; error: unknown }) => void) =>
    resolve({ data: resolveData, error: resolveError });
  return chain;
}

describe('GET /api/care/appointments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('gibt 401 ohne Authentifizierung zurueck', async () => {
    mockRequireAuth.mockResolvedValue(null);
    const { GET } = await import('@/app/api/care/appointments/route');
    const req = new NextRequest('http://localhost/api/care/appointments');
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('gibt 403 bei fehlendem Plus-Abo zurueck', async () => {
    mockRequireAuth.mockResolvedValue({ supabase: { from: vi.fn() }, user: { id: 'u1' } });
    mockRequireSubscription.mockResolvedValue(
      NextResponse.json({ error: 'Plus-Abo erforderlich' }, { status: 403 })
    );
    const { GET } = await import('@/app/api/care/appointments/route');
    const req = new NextRequest('http://localhost/api/care/appointments');
    const res = await GET(req);
    expect(res.status).toBe(403);
  });

  it('gibt Termine zurueck (200)', async () => {
    const mockData = [
      { id: 'a1', title: 'Arzttermin', scheduled_at: '2026-04-01T10:00:00Z' },
    ];
    const chain = createChain(mockData);
    const mockSupabase = { from: vi.fn().mockReturnValue(chain) };
    mockRequireAuth.mockResolvedValue({ supabase: mockSupabase, user: { id: 'u1' } });
    mockRequireSubscription.mockResolvedValue(true);

    const { GET } = await import('@/app/api/care/appointments/route');
    const req = new NextRequest('http://localhost/api/care/appointments');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveLength(1);
    expect(data[0].title).toBe('Arzttermin');
  });

  it('prueft Zugriff bei fremdem senior_id (403)', async () => {
    const mockSupabase = { from: vi.fn().mockReturnValue(createChain()) };
    mockRequireAuth.mockResolvedValue({ supabase: mockSupabase, user: { id: 'u1' } });
    mockRequireSubscription.mockResolvedValue(true);
    mockRequireCareAccess.mockResolvedValue(null);

    const { GET } = await import('@/app/api/care/appointments/route');
    const req = new NextRequest('http://localhost/api/care/appointments?senior_id=other-user');
    const res = await GET(req);
    expect(res.status).toBe(403);
  });
});

describe('POST /api/care/appointments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('erstellt neuen Termin (201)', async () => {
    const newAppointment = { id: 'a2', title: 'Zahnarzt', scheduled_at: '2026-04-05T14:00:00Z', senior_id: 'u1' };
    const chain = createChain(newAppointment);
    const mockSupabase = { from: vi.fn().mockReturnValue(chain) };
    mockRequireAuth.mockResolvedValue({ supabase: mockSupabase, user: { id: 'u1' } });
    mockRequireSubscription.mockResolvedValue(true);

    const { POST } = await import('@/app/api/care/appointments/route');
    const req = new NextRequest('http://localhost/api/care/appointments', {
      method: 'POST',
      body: JSON.stringify({ title: 'Zahnarzt', scheduled_at: '2026-04-05T14:00:00Z' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
  });

  it('lehnt ab ohne Titel (400)', async () => {
    const mockSupabase = { from: vi.fn() };
    mockRequireAuth.mockResolvedValue({ supabase: mockSupabase, user: { id: 'u1' } });
    mockRequireSubscription.mockResolvedValue(true);

    const { POST } = await import('@/app/api/care/appointments/route');
    const req = new NextRequest('http://localhost/api/care/appointments', {
      method: 'POST',
      body: JSON.stringify({ scheduled_at: '2026-04-05T14:00:00Z' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('lehnt ab ohne scheduled_at (400)', async () => {
    const mockSupabase = { from: vi.fn() };
    mockRequireAuth.mockResolvedValue({ supabase: mockSupabase, user: { id: 'u1' } });
    mockRequireSubscription.mockResolvedValue(true);

    const { POST } = await import('@/app/api/care/appointments/route');
    const req = new NextRequest('http://localhost/api/care/appointments', {
      method: 'POST',
      body: JSON.stringify({ title: 'Zahnarzt' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('lehnt ungueltiges JSON ab (400)', async () => {
    const mockSupabase = { from: vi.fn() };
    mockRequireAuth.mockResolvedValue({ supabase: mockSupabase, user: { id: 'u1' } });
    mockRequireSubscription.mockResolvedValue(true);

    const { POST } = await import('@/app/api/care/appointments/route');
    const req = new NextRequest('http://localhost/api/care/appointments', {
      method: 'POST',
      body: 'not json',
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});

describe('GET /api/care/appointments/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('gibt einzelnen Termin zurueck (200)', async () => {
    const appt = { id: 'a1', title: 'Arzttermin', senior_id: 'u1' };
    const chain = createChain(appt);
    const mockSupabase = { from: vi.fn().mockReturnValue(chain) };
    mockRequireAuth.mockResolvedValue({ supabase: mockSupabase, user: { id: 'u1' } });
    mockRequireSubscription.mockResolvedValue(true);

    const { GET } = await import('@/app/api/care/appointments/[id]/route');
    const req = new NextRequest('http://localhost/api/care/appointments/a1');
    const res = await GET(req, { params: Promise.resolve({ id: 'a1' }) });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.title).toBe('Arzttermin');
  });

  it('gibt 404 bei nicht existierendem Termin zurueck', async () => {
    const chain = createChain(null, { code: 'PGRST116', message: 'not found' });
    const mockSupabase = { from: vi.fn().mockReturnValue(chain) };
    mockRequireAuth.mockResolvedValue({ supabase: mockSupabase, user: { id: 'u1' } });
    mockRequireSubscription.mockResolvedValue(true);

    const { GET } = await import('@/app/api/care/appointments/[id]/route');
    const req = new NextRequest('http://localhost/api/care/appointments/invalid');
    const res = await GET(req, { params: Promise.resolve({ id: 'invalid' }) });
    expect(res.status).toBe(404);
  });

  it('gibt 401 ohne Authentifizierung zurueck', async () => {
    mockRequireAuth.mockResolvedValue(null);
    const { GET } = await import('@/app/api/care/appointments/[id]/route');
    const req = new NextRequest('http://localhost/api/care/appointments/a1');
    const res = await GET(req, { params: Promise.resolve({ id: 'a1' }) });
    expect(res.status).toBe(401);
  });
});

describe('PATCH /api/care/appointments/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('aktualisiert Termin (200)', async () => {
    const updated = { id: 'a1', title: 'Neuer Titel', senior_id: 'u1' };
    const chain = createChain(updated);
    // Brauche zwei from()-Aufrufe: select für existing check, update für actual update
    const mockSupabase = { from: vi.fn().mockReturnValue(chain) };
    mockRequireAuth.mockResolvedValue({ supabase: mockSupabase, user: { id: 'u1' } });
    mockRequireSubscription.mockResolvedValue(true);

    const { PATCH } = await import('@/app/api/care/appointments/[id]/route');
    const req = new NextRequest('http://localhost/api/care/appointments/a1', {
      method: 'PATCH',
      body: JSON.stringify({ title: 'Neuer Titel' }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: 'a1' }) });
    expect(res.status).toBe(200);
  });

  it('lehnt ab ohne aenderbare Felder (400)', async () => {
    const mockSupabase = { from: vi.fn() };
    mockRequireAuth.mockResolvedValue({ supabase: mockSupabase, user: { id: 'u1' } });
    mockRequireSubscription.mockResolvedValue(true);

    const { PATCH } = await import('@/app/api/care/appointments/[id]/route');
    const req = new NextRequest('http://localhost/api/care/appointments/a1', {
      method: 'PATCH',
      body: JSON.stringify({ unknown_field: 'test' }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: 'a1' }) });
    expect(res.status).toBe(400);
  });

  it('lehnt ungueltiges JSON ab (400)', async () => {
    const mockSupabase = { from: vi.fn() };
    mockRequireAuth.mockResolvedValue({ supabase: mockSupabase, user: { id: 'u1' } });
    mockRequireSubscription.mockResolvedValue(true);

    const { PATCH } = await import('@/app/api/care/appointments/[id]/route');
    const req = new NextRequest('http://localhost/api/care/appointments/a1', {
      method: 'PATCH',
      body: 'not json',
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: 'a1' }) });
    expect(res.status).toBe(400);
  });
});

describe('DELETE /api/care/appointments/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('loescht Termin erfolgreich', async () => {
    const existing = { senior_id: 'u1' };
    const chain = createChain(existing);
    const mockSupabase = { from: vi.fn().mockReturnValue(chain) };
    mockRequireAuth.mockResolvedValue({ supabase: mockSupabase, user: { id: 'u1' } });
    mockRequireSubscription.mockResolvedValue(true);

    const { DELETE } = await import('@/app/api/care/appointments/[id]/route');
    const req = new NextRequest('http://localhost/api/care/appointments/a1', { method: 'DELETE' });
    const res = await DELETE(req, { params: Promise.resolve({ id: 'a1' }) });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
  });

  it('gibt 404 bei nicht existierendem Termin zurueck', async () => {
    const chain = createChain(null, { code: 'PGRST116', message: 'not found' });
    const mockSupabase = { from: vi.fn().mockReturnValue(chain) };
    mockRequireAuth.mockResolvedValue({ supabase: mockSupabase, user: { id: 'u1' } });
    mockRequireSubscription.mockResolvedValue(true);

    const { DELETE } = await import('@/app/api/care/appointments/[id]/route');
    const req = new NextRequest('http://localhost/api/care/appointments/invalid', { method: 'DELETE' });
    const res = await DELETE(req, { params: Promise.resolve({ id: 'invalid' }) });
    expect(res.status).toBe(404);
  });

  it('gibt 401 ohne Authentifizierung zurueck', async () => {
    mockRequireAuth.mockResolvedValue(null);
    const { DELETE } = await import('@/app/api/care/appointments/[id]/route');
    const req = new NextRequest('http://localhost/api/care/appointments/a1', { method: 'DELETE' });
    const res = await DELETE(req, { params: Promise.resolve({ id: 'a1' }) });
    expect(res.status).toBe(401);
  });
});
