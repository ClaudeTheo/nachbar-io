// __tests__/api/alerts.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mocks
const mockGetUser = vi.fn();
const mockSelect = vi.fn();
const mockInsert = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: vi.fn(() => ({
      select: mockSelect,
      insert: mockInsert,
    })),
  })),
}));

vi.mock('@/lib/quarters/helpers', () => ({
  getUserQuarterId: vi.fn().mockResolvedValue('quarter-1'),
}));

describe('GET /api/alerts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('gibt 401 ohne Authentifizierung zurueck', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const { GET } = await import('@/app/api/alerts/route');
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('gibt Alerts fuer authentifizierten Nutzer zurueck', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    const mockAlerts = [
      { id: 'a1', category: 'noise', title: 'Laerm im Hof', status: 'open' },
    ];
    const orderFn = vi.fn().mockResolvedValue({ data: mockAlerts, error: null });
    const inFn = vi.fn().mockReturnValue({ order: orderFn });
    mockSelect.mockReturnValue({ in: inFn });

    const { GET } = await import('@/app/api/alerts/route');
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0].category).toBe('noise');
  });
});

describe('POST /api/alerts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('gibt 401 ohne Authentifizierung zurueck', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const { POST } = await import('@/app/api/alerts/route');
    const req = new Request('http://localhost/api/alerts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const res = await POST(req as any);
    expect(res.status).toBe(401);
  });

  it('gibt 400 bei ungueltiger Kategorie zurueck', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });

    const { POST } = await import('@/app/api/alerts/route');
    const req = new Request('http://localhost/api/alerts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category: 'invalid', title: 'Test Alert' }),
    });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
  });

  it('gibt 400 bei zu kurzem Titel zurueck', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });

    const { POST } = await import('@/app/api/alerts/route');
    const req = new Request('http://localhost/api/alerts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category: 'noise', title: 'AB' }),
    });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
  });
});
