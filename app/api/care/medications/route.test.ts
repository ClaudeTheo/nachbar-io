// app/api/care/medications/route.test.ts
// Nachbar.io — Tests fuer Medikamente API-Route (GET + POST)
// Testet: Auth, Subscription-Gate, Zugriff, Validierung, Consent, Verschluesselung

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

// --- Mocks ---
const mockUser = { id: 'user-1', email: 'test@test.de' };
const mockRequireAuth = vi.fn();
const mockRequireSubscription = vi.fn();
const mockRequireCareAccess = vi.fn();

vi.mock('@/lib/care/api-helpers', () => ({
  requireAuth: (...args: unknown[]) => mockRequireAuth(...args),
  requireSubscription: (...args: unknown[]) => mockRequireSubscription(...args),
  unauthorizedResponse: () => NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 }),
  requireCareAccess: (...args: unknown[]) => mockRequireCareAccess(...args),
}));

vi.mock('@/lib/care/audit', () => ({
  writeAuditLog: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/care/consent', () => ({
  checkCareConsent: vi.fn().mockResolvedValue(true),
}));

vi.mock('@/lib/care/field-encryption', () => ({
  encryptFields: vi.fn((_data: unknown) => _data),
  decryptFieldsArray: vi.fn((_data: unknown) => _data),
  CARE_MEDICATIONS_ENCRYPTED_FIELDS: ['name', 'dosage', 'instructions'],
}));

// Proxy-basierter Supabase-Mock: jede Chain-Methode gibt den Proxy zurueck
const mockMeds = [
  { id: 'med-1', name: 'Metformin', dosage: '500mg', active: true },
  { id: 'med-2', name: 'Ramipril', dosage: '5mg', active: true },
];

function createChainProxy(resolveValue: { data: unknown; error: unknown }): unknown {
  const handler: ProxyHandler<Record<string, unknown>> = {
    get(_target, prop: string) {
      if (prop === 'then') {
        return (resolve: (v: unknown) => void, reject?: (e: unknown) => void) =>
          Promise.resolve(resolveValue).then(resolve, reject);
      }
      return () => new Proxy({}, handler);
    },
  };
  return new Proxy({}, handler);
}

const mockInsertResult = { data: { id: 'med-new', name: 'Ibuprofen' }, error: null };
const mockFrom = vi.fn().mockImplementation(() => ({
  select: () => createChainProxy({ data: mockMeds, error: null }),
  insert: () => ({ select: () => ({ single: vi.fn().mockResolvedValue(mockInsertResult) }) }),
}));

const mockSupabase = { from: mockFrom, auth: { getUser: vi.fn() } };

import { GET, POST } from './route';
import { checkCareConsent } from '@/lib/care/consent';

// --- Helpers ---
function createGetRequest(params: Record<string, string> = {}): NextRequest {
  const url = new URL('http://localhost:3000/api/care/medications');
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new NextRequest(url);
}

function createPostRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost:3000/api/care/medications', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('GET /api/care/medications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAuth.mockResolvedValue({ supabase: mockSupabase, user: mockUser });
    mockRequireSubscription.mockResolvedValue(true);
  });

  it('gibt 401 wenn nicht authentifiziert', async () => {
    mockRequireAuth.mockResolvedValue(null);
    const res = await GET(createGetRequest());
    expect(res.status).toBe(401);
  });

  it('prueft Subscription-Gate (Plus erforderlich)', async () => {
    mockRequireSubscription.mockResolvedValue(
      NextResponse.json({ error: 'Plus erforderlich' }, { status: 403 }),
    );
    const res = await GET(createGetRequest());
    expect(res.status).toBe(403);
  });

  it('laedt Medikamente fuer eigenen User', async () => {
    const res = await GET(createGetRequest());
    expect(res.status).toBe(200);
  });

  it('prueft Zugriff bei Fremd-Zugriff via senior_id', async () => {
    mockRequireCareAccess.mockResolvedValue('admin');
    const res = await GET(createGetRequest({ senior_id: 'senior-x' }));
    expect(res.status).toBe(200);
    expect(mockRequireCareAccess).toHaveBeenCalledWith(expect.anything(), 'senior-x');
  });

  it('gibt 403 bei fehlendem Fremd-Zugriff', async () => {
    mockRequireCareAccess.mockResolvedValue(null);
    const res = await GET(createGetRequest({ senior_id: 'fremder' }));
    expect(res.status).toBe(403);
  });
});

describe('POST /api/care/medications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAuth.mockResolvedValue({ supabase: mockSupabase, user: mockUser });
    mockRequireSubscription.mockResolvedValue(true);
  });

  it('gibt 401 wenn nicht authentifiziert', async () => {
    mockRequireAuth.mockResolvedValue(null);
    const res = await POST(createPostRequest({ name: 'Test', schedule: { type: 'daily' } }));
    expect(res.status).toBe(401);
  });

  it('gibt 403 wenn Consent fehlt', async () => {
    vi.mocked(checkCareConsent).mockResolvedValueOnce(false);
    const res = await POST(createPostRequest({ name: 'Test', schedule: { type: 'daily' } }));
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.feature).toBe('medications');
  });

  it('weist fehlenden Namen ab', async () => {
    const res = await POST(createPostRequest({ schedule: { type: 'daily' } }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('Name');
  });

  it('weist zu kurzen Namen ab (< 2 Zeichen)', async () => {
    const res = await POST(createPostRequest({ name: 'X', schedule: { type: 'daily' } }));
    expect(res.status).toBe(400);
  });

  it('weist fehlenden Zeitplan ab', async () => {
    const res = await POST(createPostRequest({ name: 'Metformin' }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('Zeitplan');
  });

  it('weist ungueltigen Zeitplan-Typ ab', async () => {
    const res = await POST(createPostRequest({ name: 'Metformin', schedule: { type: 'monthly' } }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('Ungueltiger Zeitplan-Typ');
  });

  it('akzeptiert gueltiges Medikament', async () => {
    const res = await POST(createPostRequest({
      name: 'Metformin',
      dosage: '500mg',
      schedule: { type: 'daily', times: ['08:00', '20:00'] },
      instructions: 'Nach dem Essen',
    }));
    expect(res.status).toBe(201);
  });

  it('weist zu lange Anweisungen ab (> 2000 Zeichen)', async () => {
    const res = await POST(createPostRequest({
      name: 'Test',
      schedule: { type: 'daily' },
      instructions: 'A'.repeat(2001),
    }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('2000 Zeichen');
  });

  it('weist ungueltiges JSON ab', async () => {
    const req = new NextRequest('http://localhost:3000/api/care/medications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'kein-json',
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('akzeptiert verschiedene Zeitplan-Typen', async () => {
    for (const type of ['daily', 'weekly', 'interval']) {
      mockRequireAuth.mockResolvedValue({ supabase: mockSupabase, user: mockUser });
      mockRequireSubscription.mockResolvedValue(true);
      const res = await POST(createPostRequest({
        name: 'Testmed',
        schedule: { type },
      }));
      expect(res.status).toBe(201);
    }
  });
});
