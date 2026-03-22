// app/api/care/sos/[id]/respond/route.test.ts
// Nachbar.io — Tests fuer SOS-Respond API-Route
// Testet: Auth, Validierung, Zugriffskontrolle (nur verifizierte Helfer)

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

vi.mock('@/lib/care/notifications', () => ({
  sendCareNotification: vi.fn().mockResolvedValue({ anyDelivered: true }),
}));

vi.mock('@/lib/care/field-encryption', () => ({
  encryptField: vi.fn((v: unknown) => v),
  decryptFields: vi.fn((v: unknown) => v),
  CARE_SOS_RESPONSES_ENCRYPTED_FIELDS: ['note'],
}));

import { POST } from './route';

function createRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost:3000/api/care/sos/alert-1/respond', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const ALERT_ID = 'alert-1';
const mockParams = Promise.resolve({ id: ALERT_ID });

describe('POST /api/care/sos/[id]/respond', () => {
  beforeEach(() => {
    mockSupabase.reset();
    vi.clearAllMocks();
  });

  it('gibt 401 wenn nicht authentifiziert', async () => {
    const res = await POST(createRequest({ response_type: 'accepted' }), { params: mockParams });
    expect(res.status).toBe(401);
  });

  it('gibt 400 ohne response_type', async () => {
    mockSupabase.setUser({ id: 'helfer-1' });
    const res = await POST(createRequest({}), { params: mockParams });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('response_type');
  });

  it('gibt 400 bei ungueltigem response_type', async () => {
    mockSupabase.setUser({ id: 'helfer-1' });
    const res = await POST(createRequest({ response_type: 'maybe_later' }), { params: mockParams });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('Ungültiger Reaktionstyp');
  });

  it('gibt 400 bei ungueltigem JSON', async () => {
    mockSupabase.setUser({ id: 'helfer-1' });
    const req = new NextRequest('http://localhost:3000/api/care/sos/alert-1/respond', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'kein-json',
    });
    const res = await POST(req, { params: mockParams });
    expect(res.status).toBe(400);
  });
});
