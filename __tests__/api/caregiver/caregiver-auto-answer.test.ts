// __tests__/api/caregiver/caregiver-auto-answer.test.ts
// Tests fuer GET/PATCH /api/caregiver/auto-answer — Auto-Answer-Einstellungen

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// --- Mocks ---

let mockUser: { id: string; email: string } | null;

// Subscription-Ergebnis fuer Plus-Gate
const PLUS_SUB_RESULT = { data: { plan: 'plus', status: 'active' }, error: null };

function createMockSupabase(callResults: Array<{ data: unknown; error: unknown }>) {
  let callIndex = 0;
  // Subscription-Gate als ersten Aufruf voranstellen
  const allResults = [PLUS_SUB_RESULT, ...callResults];

  return {
    auth: {
      getUser: vi.fn().mockImplementation(() =>
        Promise.resolve({ data: { user: mockUser }, error: null })
      ),
    },
    from: vi.fn().mockImplementation(() => {
      const response = allResults[callIndex] ?? { data: null, error: null };
      callIndex++;

      const chain: Record<string, unknown> = {};
      const terminalResult = Promise.resolve(response);

      chain.select = vi.fn().mockReturnValue(chain);
      chain.update = vi.fn().mockReturnValue(chain);
      chain.eq = vi.fn().mockReturnValue(chain);
      chain.is = vi.fn().mockReturnValue(chain);
      chain.single = vi.fn().mockReturnValue(terminalResult);
      chain.maybeSingle = vi.fn().mockReturnValue(terminalResult);
      chain.then = terminalResult.then.bind(terminalResult);

      return chain;
    }),
  };
}

let mockSupabase: ReturnType<typeof createMockSupabase>;

vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({
    getAll: () => [],
    set: vi.fn(),
  }),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockImplementation(() => Promise.resolve(mockSupabase)),
}));

// --- Hilfsfunktionen ---

function makeGetRequest(linkId?: string): NextRequest {
  const url = new URL('http://localhost/api/caregiver/auto-answer');
  if (linkId) url.searchParams.set('linkId', linkId);
  return new NextRequest(url, { method: 'GET' });
}

function makePatchRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost/api/caregiver/auto-answer', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

// --- Tests ---

describe('GET /api/caregiver/auto-answer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockUser = { id: 'cg-1', email: 'lisa@test.de' };
  });

  it('gibt Auto-Answer-Einstellungen zurueck', async () => {
    mockSupabase = createMockSupabase([
      {
        data: { auto_answer_allowed: true, auto_answer_start: '08:00', auto_answer_end: '20:00' },
        error: null,
      },
    ]);

    const { GET } = await import('@/app/api/caregiver/auto-answer/route');
    const response = await GET(makeGetRequest('link-123'));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.auto_answer_allowed).toBe(true);
    expect(json.auto_answer_start).toBe('08:00');
    expect(json.auto_answer_end).toBe('20:00');
  });

  it('gibt 401 ohne Authentifizierung', async () => {
    mockUser = null;
    mockSupabase = createMockSupabase([]);

    const { GET } = await import('@/app/api/caregiver/auto-answer/route');
    const response = await GET(makeGetRequest('link-123'));

    expect(response.status).toBe(401);
  });

  it('gibt 400 bei fehlender linkId', async () => {
    mockSupabase = createMockSupabase([]);

    const { GET } = await import('@/app/api/caregiver/auto-answer/route');
    const response = await GET(makeGetRequest());

    expect(response.status).toBe(400);
  });

  it('gibt 404 wenn Link nicht gefunden', async () => {
    mockSupabase = createMockSupabase([
      { data: null, error: { code: 'PGRST116', message: 'Not found' } },
    ]);

    const { GET } = await import('@/app/api/caregiver/auto-answer/route');
    const response = await GET(makeGetRequest('invalid-link'));

    expect(response.status).toBe(404);
  });
});

describe('PATCH /api/caregiver/auto-answer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockUser = { id: 'cg-1', email: 'lisa@test.de' };
  });

  it('aktualisiert Auto-Answer-Einstellungen', async () => {
    mockSupabase = createMockSupabase([
      { data: null, error: null },
    ]);

    const { PATCH } = await import('@/app/api/caregiver/auto-answer/route');
    const response = await PATCH(makePatchRequest({
      linkId: 'link-123',
      autoAnswerAllowed: true,
      autoAnswerStart: '09:00',
      autoAnswerEnd: '18:00',
    }));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.ok).toBe(true);
  });

  it('gibt 401 ohne Authentifizierung', async () => {
    mockUser = null;
    mockSupabase = createMockSupabase([]);

    const { PATCH } = await import('@/app/api/caregiver/auto-answer/route');
    const response = await PATCH(makePatchRequest({ linkId: 'link-123' }));

    expect(response.status).toBe(401);
  });

  it('gibt 400 bei fehlender linkId', async () => {
    mockSupabase = createMockSupabase([]);

    const { PATCH } = await import('@/app/api/caregiver/auto-answer/route');
    const response = await PATCH(makePatchRequest({ autoAnswerAllowed: true }));

    expect(response.status).toBe(400);
  });

  it('gibt 500 bei DB-Fehler', async () => {
    mockSupabase = createMockSupabase([
      { data: null, error: { code: 'INTERNAL', message: 'DB error' } },
    ]);

    const { PATCH } = await import('@/app/api/caregiver/auto-answer/route');
    const response = await PATCH(makePatchRequest({
      linkId: 'link-123',
      autoAnswerAllowed: true,
      autoAnswerStart: '08:00',
      autoAnswerEnd: '20:00',
    }));

    expect(response.status).toBe(500);
  });
});
