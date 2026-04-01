// __tests__/api/speed-dial.test.ts
// Unit-Tests fuer Speed-Dial CRUD API (Kurzwahl-Favoriten)
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';

// Mock-Funktionen fuer Supabase-Client
const mockGetUser = vi.fn();
const mockFrom = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}));

// Crypto-Mock (fuer emergency_contact Aufloesung)
vi.mock('@/modules/care/services/crypto', () => ({
  decrypt: vi.fn((val: string) => val),
  encrypt: vi.fn((val: string) => val),
}));

// Hilfsfunktion: Request erstellen
function makeRequest(url: string, opts?: RequestInit) {
  return new Request(url, opts) as unknown as NextRequest;
}

describe('GET /api/speed-dial', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('gibt 401 ohne Auth zurueck', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const { GET } = await import('@/app/api/speed-dial/route');
    const res = await GET(makeRequest('http://localhost/api/speed-dial'));
    expect(res.status).toBe(401);
  });

  it('gibt leeres Array zurueck wenn keine Favoriten', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({ data: [], error: null }),
        }),
      }),
    });

    const { GET } = await import('@/app/api/speed-dial/route');
    const res = await GET(makeRequest('http://localhost/api/speed-dial'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body).toHaveLength(0);
  });

  it('gibt Array von aufgeloesten Favoriten zurueck (caregiver_link)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });

    // Erster Aufruf: speed_dial_favorites laden
    const mockOrder = vi.fn().mockReturnValue({
      data: [
        { id: 'f1', user_id: 'user-1', source_type: 'caregiver_link', source_id: 'profile-1', sort_order: 1 },
      ],
      error: null,
    });
    const mockEq = vi.fn().mockReturnValue({ order: mockOrder });
    const mockSelectFav = vi.fn().mockReturnValue({ eq: mockEq });

    // Zweiter Aufruf: profiles fuer caregiver_link
    const mockSingle = vi.fn().mockReturnValue({
      data: { id: 'profile-1', full_name: 'Max Muster', avatar_url: '/img/max.jpg' },
      error: null,
    });
    const mockEqProfile = vi.fn().mockReturnValue({ single: mockSingle });
    const mockSelectProfile = vi.fn().mockReturnValue({ eq: mockEqProfile });

    let callCount = 0;
    mockFrom.mockImplementation((table: string) => {
      if (table === 'speed_dial_favorites') {
        return { select: mockSelectFav };
      }
      if (table === 'profiles') {
        return { select: mockSelectProfile };
      }
      return {};
    });

    const { GET } = await import('@/app/api/speed-dial/route');
    const res = await GET(makeRequest('http://localhost/api/speed-dial'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body).toHaveLength(1);
    expect(body[0].display_name).toBe('Max Muster');
    expect(body[0].avatar_url).toBe('/img/max.jpg');
    expect(body[0].target_user_id).toBe('profile-1');
  });

  it('nutzt userId-Parameter fuer fremdes Profil', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'caregiver-1' } } });
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({ data: [], error: null }),
        }),
      }),
    });

    const { GET } = await import('@/app/api/speed-dial/route');
    const res = await GET(makeRequest('http://localhost/api/speed-dial?userId=bewohner-1'));
    expect(res.status).toBe(200);
    // Pruefe dass Supabase mit bewohner-1 aufgerufen wurde
    const selectCall = mockFrom.mock.results[0].value.select;
    const eqCall = selectCall.mock.results[0].value.eq;
    expect(eqCall).toHaveBeenCalledWith('user_id', 'bewohner-1');
  });
});

describe('POST /api/speed-dial', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    (mockFrom as any)._callIdx = 0;
  });

  it('gibt 401 ohne Auth zurueck', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const { POST } = await import('@/app/api/speed-dial/route');
    const res = await POST(makeRequest('http://localhost/api/speed-dial', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: 'u1', source_type: 'caregiver_link', source_id: 'c1', sort_order: 1 }),
    }));
    expect(res.status).toBe(401);
  });

  it('erstellt Favorit mit Status 201', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });

    // Count-Abfrage: 2 bestehende Eintraege
    const mockCountHead = vi.fn().mockReturnValue({ count: 2, error: null });
    const mockCountEq = vi.fn().mockReturnValue(mockCountHead());
    const mockCountSelect = vi.fn().mockReturnValue({ eq: mockCountEq });

    // Insert-Abfrage
    const insertedEntry = {
      id: 'new-1', user_id: 'user-1', source_type: 'caregiver_link',
      source_id: 'c1', sort_order: 3, created_by: 'user-1',
    };
    const mockSingle = vi.fn().mockReturnValue({ data: insertedEntry, error: null });
    const mockInsertSelect = vi.fn().mockReturnValue({ single: mockSingle });
    const mockInsert = vi.fn().mockReturnValue({ select: mockInsertSelect });

    mockFrom.mockImplementation((table: string) => {
      // Beide Aufrufe gehen an speed_dial_favorites
      if (!mockFrom._callIdx) mockFrom._callIdx = 0;
      mockFrom._callIdx++;
      if (mockFrom._callIdx === 1) {
        return { select: mockCountSelect };
      }
      return { insert: mockInsert };
    });

    const { POST } = await import('@/app/api/speed-dial/route');
    const res = await POST(makeRequest('http://localhost/api/speed-dial', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: 'user-1', source_type: 'caregiver_link', source_id: 'c1', sort_order: 3 }),
    }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).toBe('new-1');
  });

  it('lehnt ab wenn bereits 5 Favoriten existieren', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });

    const mockCountHead = vi.fn().mockReturnValue({ count: 5, error: null });
    const mockCountEq = vi.fn().mockReturnValue(mockCountHead());
    const mockCountSelect = vi.fn().mockReturnValue({ eq: mockCountEq });

    mockFrom.mockReturnValue({ select: mockCountSelect });

    const { POST } = await import('@/app/api/speed-dial/route');
    const res = await POST(makeRequest('http://localhost/api/speed-dial', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: 'user-1', source_type: 'caregiver_link', source_id: 'c1', sort_order: 1 }),
    }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('5 Favoriten');
  });

  it('lehnt ungueltige sort_order ab', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });

    // Count-Abfrage: 0 bestehende
    const mockCountHead = vi.fn().mockReturnValue({ count: 0, error: null });
    const mockCountEq = vi.fn().mockReturnValue(mockCountHead());
    const mockCountSelect = vi.fn().mockReturnValue({ eq: mockCountEq });
    mockFrom.mockReturnValue({ select: mockCountSelect });

    const { POST } = await import('@/app/api/speed-dial/route');
    const res = await POST(makeRequest('http://localhost/api/speed-dial', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: 'user-1', source_type: 'caregiver_link', source_id: 'c1', sort_order: 7 }),
    }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('sort_order');
  });

  it('gibt 409 bei Unique-Constraint-Verletzung', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });

    // Count: 2
    const mockCountHead = vi.fn().mockReturnValue({ count: 2, error: null });
    const mockCountEq = vi.fn().mockReturnValue(mockCountHead());
    const mockCountSelect = vi.fn().mockReturnValue({ eq: mockCountEq });

    // Insert: 23505 Unique-Violation
    const mockSingle = vi.fn().mockReturnValue({ data: null, error: { code: '23505', message: 'unique' } });
    const mockInsertSelect = vi.fn().mockReturnValue({ single: mockSingle });
    const mockInsert = vi.fn().mockReturnValue({ select: mockInsertSelect });

    mockFrom.mockImplementation(() => {
      if (!mockFrom._callIdx) mockFrom._callIdx = 0;
      mockFrom._callIdx++;
      if (mockFrom._callIdx === 1) return { select: mockCountSelect };
      return { insert: mockInsert };
    });

    const { POST } = await import('@/app/api/speed-dial/route');
    const res = await POST(makeRequest('http://localhost/api/speed-dial', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: 'user-1', source_type: 'caregiver_link', source_id: 'c1', sort_order: 1 }),
    }));
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toContain('bereits vergeben');
  });
});

describe('DELETE /api/speed-dial', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('gibt 401 ohne Auth zurueck', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const { DELETE } = await import('@/app/api/speed-dial/route');
    const res = await DELETE(makeRequest('http://localhost/api/speed-dial?id=f1'));
    expect(res.status).toBe(401);
  });

  it('gibt 400 wenn id fehlt', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    const { DELETE } = await import('@/app/api/speed-dial/route');
    const res = await DELETE(makeRequest('http://localhost/api/speed-dial'));
    expect(res.status).toBe(400);
  });

  it('loescht Favorit und gibt success zurueck', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });

    const mockDeleteEq = vi.fn().mockReturnValue({ error: null });
    const mockDeleteFn = vi.fn().mockReturnValue({ eq: mockDeleteEq });
    mockFrom.mockReturnValue({ delete: mockDeleteFn });

    const { DELETE } = await import('@/app/api/speed-dial/route');
    const res = await DELETE(makeRequest('http://localhost/api/speed-dial?id=f1'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});
