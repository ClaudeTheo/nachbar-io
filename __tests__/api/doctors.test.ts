// __tests__/api/doctors.test.ts
// Tests fuer GET /api/doctors — Oeffentliche Arzt-Liste

import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- Mocks ---
vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({
    getAll: () => [],
    set: vi.fn(),
  }),
}));

let mockQueryResult: { data: unknown; error: unknown };

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockImplementation(() =>
    Promise.resolve({
      from: vi.fn(() => {
        const chain: Record<string, unknown> = {};
        const terminalResult = Promise.resolve(mockQueryResult);

        chain.select = vi.fn().mockReturnValue(chain);
        chain.eq = vi.fn().mockReturnValue(chain);
        chain.contains = vi.fn().mockReturnValue(chain);
        chain.order = vi.fn().mockReturnValue(chain);
        chain.then = terminalResult.then.bind(terminalResult);

        return chain;
      }),
    })
  ),
}));

// NextRequest braucht nextUrl — wir bauen einen Minimal-Mock
function makeNextRequest(url: string) {
  const parsed = new URL(url);
  return {
    nextUrl: parsed,
    headers: new Headers(),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockQueryResult = { data: [], error: null };
});

describe('GET /api/doctors', () => {
  it('gibt eine Liste sichtbarer Aerzte zurueck', async () => {
    mockQueryResult = {
      data: [
        { id: 'd-1', user_id: 'u-1', specialization: ['Allgemeinmedizin'], visible: true },
        { id: 'd-2', user_id: 'u-2', specialization: ['Kardiologie'], visible: true },
      ],
      error: null,
    };

    const { GET } = await import('@/app/api/doctors/route');
    const response = await GET(makeNextRequest('http://localhost/api/doctors') as never);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toHaveLength(2);
    expect(json[0].specialization).toContain('Allgemeinmedizin');
  });

  it('gibt leere Liste zurueck wenn keine Aerzte vorhanden', async () => {
    mockQueryResult = { data: [], error: null };

    const { GET } = await import('@/app/api/doctors/route');
    const response = await GET(makeNextRequest('http://localhost/api/doctors') as never);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toEqual([]);
  });

  it('gibt 500 bei Datenbankfehler', async () => {
    mockQueryResult = { data: null, error: { message: 'Query failed' } };

    const { GET } = await import('@/app/api/doctors/route');
    const response = await GET(makeNextRequest('http://localhost/api/doctors') as never);

    expect(response.status).toBe(500);
  });

  it('unterstuetzt Filter nach quarter_id', async () => {
    mockQueryResult = {
      data: [{ id: 'd-1', quarter_ids: ['q-1'] }],
      error: null,
    };

    const { GET } = await import('@/app/api/doctors/route');
    const response = await GET(makeNextRequest('http://localhost/api/doctors?quarter_id=q-1') as never);

    expect(response.status).toBe(200);
  });

  it('unterstuetzt Filter nach specialization', async () => {
    mockQueryResult = {
      data: [{ id: 'd-1', specialization: ['Allgemeinmedizin'] }],
      error: null,
    };

    const { GET } = await import('@/app/api/doctors/route');
    const response = await GET(makeNextRequest('http://localhost/api/doctors?specialization=Allgemeinmedizin') as never);

    expect(response.status).toBe(200);
  });
});
