// app/api/care/consent/route.test.ts
// Nachbar.io — Tests für Consent API-Route (GET + POST)
// Testet: Auth, Validierung, Feature-Keys, Abhängigkeiten, Audit, DSGVO Art. 9

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { createRouteMockSupabase } from '@/lib/care/__tests__/mock-supabase';

const mockSupabase = createRouteMockSupabase();

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockImplementation(() => Promise.resolve(mockSupabase.supabase)),
}));

vi.mock('@/lib/care/audit', () => ({
  writeAuditLog: vi.fn().mockResolvedValue(undefined),
}));

const mockGetConsentsForUser = vi.fn();
vi.mock('@/lib/care/consent', () => ({
  getConsentsForUser: (...args: unknown[]) => mockGetConsentsForUser(...args),
}));

import { GET, POST } from './route';
import { writeAuditLog } from '@/lib/care/audit';

// Helpers
function createGetRequest(): NextRequest {
  return new NextRequest('http://localhost:3000/api/care/consent');
}

function createPostRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost:3000/api/care/consent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const EMPTY_CONSENTS = {
  sos: { granted: false },
  checkin: { granted: false },
  medications: { granted: false },
  care_profile: { granted: false },
  emergency_contacts: { granted: false },
};

const FULL_CONSENTS = {
  sos: { granted: true },
  checkin: { granted: true },
  medications: { granted: true },
  care_profile: { granted: true },
  emergency_contacts: { granted: true },
};

describe('GET /api/care/consent', () => {
  beforeEach(() => {
    mockSupabase.reset();
    vi.clearAllMocks();
  });

  it('gibt 401 wenn nicht authentifiziert', async () => {
    const res = await GET(createGetRequest());
    expect(res.status).toBe(401);
  });

  it('lädt alle Consents für authentifizierten User', async () => {
    mockSupabase.setUser({ id: 'user-1' });
    mockGetConsentsForUser.mockResolvedValue(FULL_CONSENTS);

    const res = await GET(createGetRequest());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.consents).toBeDefined();
    expect(json.has_any_consent).toBe(true);
  });

  it('erkennt has_any_consent=false wenn keine Einwilligung', async () => {
    mockSupabase.setUser({ id: 'user-1' });
    mockGetConsentsForUser.mockResolvedValue(EMPTY_CONSENTS);

    const res = await GET(createGetRequest());
    const json = await res.json();
    expect(json.has_any_consent).toBe(false);
  });
});

describe('POST /api/care/consent', () => {
  beforeEach(() => {
    mockSupabase.reset();
    vi.clearAllMocks();
    mockSupabase.setUser({ id: 'user-1' });
    // Aktuelle Consents: alle leer
    mockGetConsentsForUser.mockResolvedValue(EMPTY_CONSENTS);
  });

  it('gibt 401 wenn nicht authentifiziert', async () => {
    mockSupabase.setUser(null);
    const res = await POST(createPostRequest({ features: { sos: true } }));
    expect(res.status).toBe(401);
  });

  it('gibt 400 bei fehlendem features-Objekt', async () => {
    const res = await POST(createPostRequest({}));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('features');
  });

  it('gibt 400 bei ungültigem Feature-Key', async () => {
    const res = await POST(createPostRequest({ features: { hacking: true } }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('Ungültiges Feature');
  });

  it('erzwingt SOS-Abhängigkeit für emergency_contacts', async () => {
    const res = await POST(createPostRequest({ features: { emergency_contacts: true } }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('SOS-Einwilligung');
  });

  it('akzeptiert emergency_contacts MIT sos', async () => {
    // Upsert-Responses für sos + emergency_contacts
    mockSupabase.addResponse('care_consents', { data: { id: 'c-1' }, error: null });
    mockSupabase.addResponse('care_consent_history', { data: null, error: null });
    mockSupabase.addResponse('care_consents', { data: { id: 'c-2' }, error: null });
    mockSupabase.addResponse('care_consent_history', { data: null, error: null });
    // getConsentsForUser nach Update
    mockGetConsentsForUser.mockResolvedValueOnce(EMPTY_CONSENTS);
    mockGetConsentsForUser.mockResolvedValueOnce({
      ...EMPTY_CONSENTS,
      sos: { granted: true },
      emergency_contacts: { granted: true },
    });

    const res = await POST(createPostRequest({ features: { sos: true, emergency_contacts: true } }));
    expect(res.status).toBe(200);
  });

  it('schreibt Audit-Log bei Änderungen', async () => {
    mockSupabase.addResponse('care_consents', { data: { id: 'c-1' }, error: null });
    mockSupabase.addResponse('care_consent_history', { data: null, error: null });
    mockGetConsentsForUser.mockResolvedValueOnce(EMPTY_CONSENTS);
    mockGetConsentsForUser.mockResolvedValueOnce({ ...EMPTY_CONSENTS, sos: { granted: true } });

    await POST(createPostRequest({ features: { sos: true } }));

    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ eventType: 'consent_updated' }),
    );
  });

  it('weist ungültiges JSON ab', async () => {
    const req = new NextRequest('http://localhost:3000/api/care/consent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'kein-json',
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
