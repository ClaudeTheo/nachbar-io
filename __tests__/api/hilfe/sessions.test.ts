// __tests__/api/hilfe/sessions.test.ts
// Nachbar Hilfe — Tests fuer Einsatz-Dokumentation API (Sessions + Signatur)

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { createRouteMockSupabase } from '@/lib/care/__tests__/mock-supabase';
import type { NextRequest } from 'next/server';

const mockSupabase = createRouteMockSupabase();

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockImplementation(() => Promise.resolve(mockSupabase.supabase)),
}));

function makePostRequest(url: string, body: Record<string, unknown>): NextRequest {
  return new Request(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }) as unknown as NextRequest;
}

function _makeGetRequest(url = 'http://localhost/api/hilfe/sessions'): NextRequest {
  const req = new Request(url, { method: 'GET' });
  Object.defineProperty(req, 'nextUrl', { value: new URL(url) });
  return req as unknown as NextRequest;
}

describe('/api/hilfe/sessions', () => {
  beforeEach(() => {
    mockSupabase.reset();
    vi.clearAllMocks();
  });

  describe('POST', () => {
    it('gibt 401 zurueck ohne Authentifizierung', async () => {
      const { POST } = await import('@/app/api/hilfe/sessions/route');
      const response = await POST(makePostRequest('http://localhost/api/hilfe/sessions', {
        match_id: 'm-1',
        session_date: '2026-03-27',
        start_time: '09:00',
        end_time: '11:00',
        activity_category: 'einkaufen',
        hourly_rate_cents: 1500,
      }));
      expect(response.status).toBe(401);
    });

    it('erstellt Session mit automatisch berechneter Dauer und Betrag (201)', async () => {
      mockSupabase.setUser({ id: 'user-1', email: 'helfer@test.de' });
      mockSupabase.addResponse('help_sessions', {
        data: {
          id: 'session-1',
          match_id: 'm-1',
          session_date: '2026-03-27',
          start_time: '09:00',
          end_time: '11:30',
          duration_minutes: 150,
          activity_category: 'einkaufen',
          activity_description: 'Wocheneinkauf begleitet',
          hourly_rate_cents: 1500,
          total_amount_cents: 3750, // 150/60 * 1500 = 3750
          helper_signature_url: null,
          resident_signature_url: null,
          status: 'draft',
        },
        error: null,
      });

      const { POST } = await import('@/app/api/hilfe/sessions/route');
      const response = await POST(makePostRequest('http://localhost/api/hilfe/sessions', {
        match_id: 'm-1',
        session_date: '2026-03-27',
        start_time: '09:00',
        end_time: '11:30',
        activity_category: 'einkaufen',
        activity_description: 'Wocheneinkauf begleitet',
        hourly_rate_cents: 1500,
      }));

      expect(response.status).toBe(201);
      const body = await response.json();
      expect(body.duration_minutes).toBe(150);
      expect(body.total_amount_cents).toBe(3750);
      expect(body.status).toBe('draft');
    });

    it('lehnt end_time <= start_time ab (400)', async () => {
      mockSupabase.setUser({ id: 'user-2', email: 'zeit@test.de' });

      const { POST } = await import('@/app/api/hilfe/sessions/route');
      const response = await POST(makePostRequest('http://localhost/api/hilfe/sessions', {
        match_id: 'm-1',
        session_date: '2026-03-27',
        start_time: '14:00',
        end_time: '13:00',
        activity_category: 'haushalt',
        hourly_rate_cents: 1200,
      }));

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toContain('end_time');
    });

    it('lehnt fehlende match_id ab (400)', async () => {
      mockSupabase.setUser({ id: 'user-3', email: 'nomatch@test.de' });

      const { POST } = await import('@/app/api/hilfe/sessions/route');
      const response = await POST(makePostRequest('http://localhost/api/hilfe/sessions', {
        session_date: '2026-03-27',
        start_time: '09:00',
        end_time: '10:00',
        activity_category: 'garten',
        hourly_rate_cents: 1000,
      }));

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toContain('match_id');
    });
  });

  describe('GET', () => {
    it('gibt 401 zurueck ohne Authentifizierung', async () => {
      const { GET } = await import('@/app/api/hilfe/sessions/route');
      const response = await GET();
      expect(response.status).toBe(401);
    });

    it('gibt Array von Sessions zurueck', async () => {
      mockSupabase.setUser({ id: 'user-4', email: 'bewohner@test.de' });
      mockSupabase.addResponse('help_sessions', {
        data: [
          { id: 'session-1', match_id: 'm-1', status: 'draft' },
          { id: 'session-2', match_id: 'm-2', status: 'signed' },
        ],
        error: null,
      });

      const { GET } = await import('@/app/api/hilfe/sessions/route');
      const response = await GET();
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(Array.isArray(body)).toBe(true);
      expect(body).toHaveLength(2);
    });
  });
});

describe('/api/hilfe/sessions/[id]/sign', () => {
  beforeEach(() => {
    mockSupabase.reset();
    vi.clearAllMocks();
  });

  it('aktualisiert Helfer-Signatur', async () => {
    mockSupabase.setUser({ id: 'helper-1', email: 'helfer@test.de' });

    // Erste Response: bestehende Session laden (select)
    mockSupabase.addResponse('help_sessions', {
      data: {
        id: 'session-1',
        helper_signature_url: null,
        resident_signature_url: null,
        status: 'draft',
      },
      error: null,
    });

    // Zweite Response: Update-Ergebnis
    mockSupabase.addResponse('help_sessions', {
      data: {
        id: 'session-1',
        helper_signature_url: 'data:image/png;base64,abc123',
        resident_signature_url: null,
        status: 'draft',
      },
      error: null,
    });

    const { POST } = await import('@/app/api/hilfe/sessions/[id]/sign/route');
    const request = makePostRequest('http://localhost/api/hilfe/sessions/session-1/sign', {
      role: 'helper',
      signature_data_url: 'data:image/png;base64,abc123',
    });

    const response = await POST(request, { params: Promise.resolve({ id: 'session-1' }) });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.helper_signature_url).toBe('data:image/png;base64,abc123');
    expect(body.status).toBe('draft');
  });

  it('setzt Status auf signed wenn beide Signaturen vorhanden', async () => {
    mockSupabase.setUser({ id: 'resident-1', email: 'bewohner@test.de' });

    // Bestehende Session hat bereits Helfer-Signatur
    mockSupabase.addResponse('help_sessions', {
      data: {
        id: 'session-2',
        helper_signature_url: 'data:image/png;base64,helfer',
        resident_signature_url: null,
        status: 'draft',
      },
      error: null,
    });

    // Update-Ergebnis: beide Signaturen vorhanden → signed
    mockSupabase.addResponse('help_sessions', {
      data: {
        id: 'session-2',
        helper_signature_url: 'data:image/png;base64,helfer',
        resident_signature_url: 'data:image/png;base64,bewohner',
        status: 'signed',
      },
      error: null,
    });

    const { POST } = await import('@/app/api/hilfe/sessions/[id]/sign/route');
    const request = makePostRequest('http://localhost/api/hilfe/sessions/session-2/sign', {
      role: 'resident',
      signature_data_url: 'data:image/png;base64,bewohner',
    });

    const response = await POST(request, { params: Promise.resolve({ id: 'session-2' }) });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.resident_signature_url).toBe('data:image/png;base64,bewohner');
    expect(body.status).toBe('signed');
  });
});
