// __tests__/api/care/consultations/consultations.test.ts
// Online-Sprechstunde: Slots auflisten, erstellen und buchen

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
  decryptFieldsArray: vi.fn((arr: Record<string, unknown>[]) => arr),
}));

vi.mock('@/lib/consultation/provider', () => ({
  getProvider: vi.fn(() => ({
    createRoom: vi.fn().mockResolvedValue({ joinUrl: 'https://meet.example.com/room-1', roomId: 'room-1' }),
  })),
}));

function createChain(resolveData: unknown = null, resolveError: unknown = null) {
  const chain: Record<string, unknown> = {};
  chain.select = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.is = vi.fn().mockReturnValue(chain);
  chain.or = vi.fn().mockReturnValue(chain);
  chain.order = vi.fn().mockReturnValue(chain);
  chain.single = vi.fn().mockResolvedValue({ data: resolveData, error: resolveError });
  chain.insert = vi.fn().mockReturnValue(chain);
  chain.update = vi.fn().mockReturnValue(chain);
  chain.then = (resolve: (v: { data: unknown; error: unknown }) => void) =>
    resolve({ data: resolveData, error: resolveError });
  return chain;
}

describe('GET /api/care/consultations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('gibt 401 ohne Authentifizierung zurueck', async () => {
    mockRequireAuth.mockResolvedValue(null);
    const { GET } = await import('@/app/api/care/consultations/route');
    const req = new NextRequest('http://localhost/api/care/consultations');
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('gibt 403 bei fehlendem Plus-Abo zurueck', async () => {
    mockRequireAuth.mockResolvedValue({ supabase: { from: vi.fn() }, user: { id: 'u1' } });
    mockRequireSubscription.mockResolvedValue(
      NextResponse.json({ error: 'Plus-Abo erforderlich' }, { status: 403 })
    );
    const { GET } = await import('@/app/api/care/consultations/route');
    const req = new NextRequest('http://localhost/api/care/consultations');
    const res = await GET(req);
    expect(res.status).toBe(403);
  });

  it('gibt Sprechstunden-Slots zurueck (200)', async () => {
    const slots = [
      { id: 's1', host_user_id: 'u1', title: 'Sprechstunde', scheduled_at: '2026-04-01T10:00:00Z', notes: null },
    ];
    const chain = createChain(slots);
    const mockSupabase = { from: vi.fn().mockReturnValue(chain) };
    mockRequireAuth.mockResolvedValue({ supabase: mockSupabase, user: { id: 'u1' } });
    mockRequireSubscription.mockResolvedValue(true);

    const { GET } = await import('@/app/api/care/consultations/route');
    const req = new NextRequest('http://localhost/api/care/consultations');
    const res = await GET(req);
    expect(res.status).toBe(200);
  });
});

describe('POST /api/care/consultations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('erstellt neuen Slot (201)', async () => {
    const newSlot = { id: 's2', host_user_id: 'u1', title: 'Sprechstunde' };
    const chain = createChain(newSlot);
    const mockSupabase = { from: vi.fn().mockReturnValue(chain) };
    mockRequireAuth.mockResolvedValue({ supabase: mockSupabase, user: { id: 'u1' } });
    mockRequireSubscription.mockResolvedValue(true);

    const { POST } = await import('@/app/api/care/consultations/route');
    const req = new NextRequest('http://localhost/api/care/consultations', {
      method: 'POST',
      body: JSON.stringify({
        quarter_id: 'q-bs',
        provider_type: 'community',
        host_name: 'Dr. Mueller',
        scheduled_at: '2026-04-01T10:00:00Z',
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
  });

  it('lehnt ab ohne quarter_id (400)', async () => {
    mockRequireAuth.mockResolvedValue({ supabase: { from: vi.fn() }, user: { id: 'u1' } });
    mockRequireSubscription.mockResolvedValue(true);

    const { POST } = await import('@/app/api/care/consultations/route');
    const req = new NextRequest('http://localhost/api/care/consultations', {
      method: 'POST',
      body: JSON.stringify({ provider_type: 'community', host_name: 'Dr. Mueller', scheduled_at: '2026-04-01T10:00:00Z' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('lehnt ungueltigen provider_type ab (400)', async () => {
    mockRequireAuth.mockResolvedValue({ supabase: { from: vi.fn() }, user: { id: 'u1' } });
    mockRequireSubscription.mockResolvedValue(true);

    const { POST } = await import('@/app/api/care/consultations/route');
    const req = new NextRequest('http://localhost/api/care/consultations', {
      method: 'POST',
      body: JSON.stringify({ quarter_id: 'q-bs', provider_type: 'invalid', host_name: 'Dr. Mueller', scheduled_at: '2026-04-01T10:00:00Z' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('lehnt ab ohne host_name (400)', async () => {
    mockRequireAuth.mockResolvedValue({ supabase: { from: vi.fn() }, user: { id: 'u1' } });
    mockRequireSubscription.mockResolvedValue(true);

    const { POST } = await import('@/app/api/care/consultations/route');
    const req = new NextRequest('http://localhost/api/care/consultations', {
      method: 'POST',
      body: JSON.stringify({ quarter_id: 'q-bs', provider_type: 'community', scheduled_at: '2026-04-01T10:00:00Z' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('lehnt ungueltiges Datum ab (400)', async () => {
    mockRequireAuth.mockResolvedValue({ supabase: { from: vi.fn() }, user: { id: 'u1' } });
    mockRequireSubscription.mockResolvedValue(true);

    const { POST } = await import('@/app/api/care/consultations/route');
    const req = new NextRequest('http://localhost/api/care/consultations', {
      method: 'POST',
      body: JSON.stringify({ quarter_id: 'q-bs', provider_type: 'community', host_name: 'Dr. Mueller', scheduled_at: 'not-a-date' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('lehnt ungueltige duration_minutes ab (400)', async () => {
    mockRequireAuth.mockResolvedValue({ supabase: { from: vi.fn() }, user: { id: 'u1' } });
    mockRequireSubscription.mockResolvedValue(true);

    const { POST } = await import('@/app/api/care/consultations/route');
    const req = new NextRequest('http://localhost/api/care/consultations', {
      method: 'POST',
      body: JSON.stringify({ quarter_id: 'q-bs', provider_type: 'community', host_name: 'Dr. Mueller', scheduled_at: '2026-04-01T10:00:00Z', duration_minutes: 120 }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('lehnt non-HTTPS join_url ab (400)', async () => {
    mockRequireAuth.mockResolvedValue({ supabase: { from: vi.fn() }, user: { id: 'u1' } });
    mockRequireSubscription.mockResolvedValue(true);

    const { POST } = await import('@/app/api/care/consultations/route');
    const req = new NextRequest('http://localhost/api/care/consultations', {
      method: 'POST',
      body: JSON.stringify({ quarter_id: 'q-bs', provider_type: 'community', host_name: 'Dr. Mueller', scheduled_at: '2026-04-01T10:00:00Z', join_url: 'http://insecure.com' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('lehnt ungueltiges JSON ab (400)', async () => {
    mockRequireAuth.mockResolvedValue({ supabase: { from: vi.fn() }, user: { id: 'u1' } });
    mockRequireSubscription.mockResolvedValue(true);

    const { POST } = await import('@/app/api/care/consultations/route');
    const req = new NextRequest('http://localhost/api/care/consultations', {
      method: 'POST',
      body: 'not json',
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});

describe('POST /api/care/consultations/[id]/book', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('bucht verfuegbaren Slot (200)', async () => {
    const slot = { id: 's1', booked_by: null, status: 'scheduled', provider_type: 'community', join_url: 'https://meet.example.com/room-1', room_id: 'room-1' };
    const updatedSlot = { ...slot, booked_by: 'u1', booked_at: '2026-03-22T10:00:00Z' };

    let callCount = 0;
    const mockSupabase = {
      from: vi.fn(() => {
        callCount++;
        if (callCount === 1) return createChain(slot); // select
        return createChain(updatedSlot); // update
      }),
    };

    mockRequireAuth.mockResolvedValue({ supabase: mockSupabase, user: { id: 'u1' } });
    mockRequireSubscription.mockResolvedValue(true);

    const { POST } = await import('@/app/api/care/consultations/[id]/book/route');
    const req = new NextRequest('http://localhost/api/care/consultations/s1/book', { method: 'POST' });
    const res = await POST(req, { params: Promise.resolve({ id: 's1' }) });
    expect(res.status).toBe(200);
  });

  it('gibt 409 bei bereits gebuchtem Slot zurueck', async () => {
    const slot = { id: 's1', booked_by: 'other-user', status: 'scheduled' };
    const mockSupabase = { from: vi.fn().mockReturnValue(createChain(slot)) };
    mockRequireAuth.mockResolvedValue({ supabase: mockSupabase, user: { id: 'u1' } });
    mockRequireSubscription.mockResolvedValue(true);

    const { POST } = await import('@/app/api/care/consultations/[id]/book/route');
    const req = new NextRequest('http://localhost/api/care/consultations/s1/book', { method: 'POST' });
    const res = await POST(req, { params: Promise.resolve({ id: 's1' }) });
    expect(res.status).toBe(409);
  });

  it('gibt 404 bei nicht existierendem Slot zurueck', async () => {
    const mockSupabase = {
      from: vi.fn().mockReturnValue(createChain(null, { code: 'PGRST116' })),
    };
    mockRequireAuth.mockResolvedValue({ supabase: mockSupabase, user: { id: 'u1' } });
    mockRequireSubscription.mockResolvedValue(true);

    const { POST } = await import('@/app/api/care/consultations/[id]/book/route');
    const req = new NextRequest('http://localhost/api/care/consultations/invalid/book', { method: 'POST' });
    const res = await POST(req, { params: Promise.resolve({ id: 'invalid' }) });
    expect(res.status).toBe(404);
  });

  it('gibt 401 ohne Authentifizierung zurueck', async () => {
    mockRequireAuth.mockResolvedValue(null);
    const { POST } = await import('@/app/api/care/consultations/[id]/book/route');
    const req = new NextRequest('http://localhost/api/care/consultations/s1/book', { method: 'POST' });
    const res = await POST(req, { params: Promise.resolve({ id: 's1' }) });
    expect(res.status).toBe(401);
  });
});
