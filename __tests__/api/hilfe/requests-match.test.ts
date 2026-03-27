// __tests__/api/hilfe/requests-match.test.ts
// Nachbar Hilfe — Tests fuer Helfer-Matching API (POST + PUT)

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { createRouteMockSupabase } from '@/lib/care/__tests__/mock-supabase';
import type { NextRequest } from 'next/server';

const mockSupabase = createRouteMockSupabase();

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockImplementation(() => Promise.resolve(mockSupabase.supabase)),
}));

function makePostRequest(body: Record<string, unknown>): NextRequest {
  return new Request('http://localhost/api/hilfe/requests/req-1/match', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }) as unknown as NextRequest;
}

function makePutRequest(body: Record<string, unknown>): NextRequest {
  return new Request('http://localhost/api/hilfe/requests/req-1/match', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }) as unknown as NextRequest;
}

const PARAMS = Promise.resolve({ id: 'req-1' });

describe('/api/hilfe/requests/[id]/match', () => {
  beforeEach(() => {
    mockSupabase.reset();
    vi.clearAllMocks();
  });

  describe('POST — Helfer bewirbt sich', () => {
    it('erstellt Bewerbung mit gueltigen Daten (201)', async () => {
      mockSupabase.setUser({ id: 'helper-1', email: 'helfer@test.de' });
      mockSupabase.addResponse('help_matches', {
        data: {
          id: 'match-1',
          request_id: 'req-1',
          helper_id: 'helper-1',
          confirmed_at: null,
        },
        error: null,
      });

      const { POST } = await import('@/app/api/hilfe/requests/[id]/match/route');
      const response = await POST(makePostRequest({ helper_id: 'helper-1' }), { params: PARAMS });
      expect(response.status).toBe(201);
      const body = await response.json();
      expect(body.request_id).toBe('req-1');
      expect(body.helper_id).toBe('helper-1');
      expect(body.confirmed_at).toBeNull();
    });

    it('gibt 401 zurueck ohne Authentifizierung', async () => {
      const { POST } = await import('@/app/api/hilfe/requests/[id]/match/route');
      const response = await POST(makePostRequest({ helper_id: 'helper-1' }), { params: PARAMS });
      expect(response.status).toBe(401);
    });
  });

  describe('PUT — Bewohner bestaetigt Match', () => {
    it('bestaetigt Match erfolgreich (200)', async () => {
      mockSupabase.setUser({ id: 'resident-1', email: 'bewohner@test.de' });
      // Erste Response: help_matches update
      mockSupabase.addResponse('help_matches', {
        data: {
          id: 'match-1',
          request_id: 'req-1',
          helper_id: 'helper-1',
          confirmed_at: '2026-03-27T10:00:00Z',
        },
        error: null,
      });
      // Zweite Response: help_requests status update
      mockSupabase.addResponse('help_requests', {
        data: null,
        error: null,
      });

      const { PUT } = await import('@/app/api/hilfe/requests/[id]/match/route');
      const response = await PUT(makePutRequest({ match_id: 'match-1' }), { params: PARAMS });
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.confirmed_at).toBeTruthy();
    });

    it('setzt Request-Status auf matched', async () => {
      mockSupabase.setUser({ id: 'resident-2', email: 'bewohner2@test.de' });
      mockSupabase.addResponse('help_matches', {
        data: {
          id: 'match-2',
          request_id: 'req-1',
          helper_id: 'helper-2',
          confirmed_at: '2026-03-27T11:00:00Z',
        },
        error: null,
      });
      mockSupabase.addResponse('help_requests', {
        data: null,
        error: null,
      });

      const { PUT } = await import('@/app/api/hilfe/requests/[id]/match/route');
      const response = await PUT(makePutRequest({ match_id: 'match-2' }), { params: PARAMS });
      expect(response.status).toBe(200);

      // Pruefen, dass help_requests mit status 'matched' aktualisiert wurde
      const helpRequestCalls = mockSupabase.fromCalls.filter(c => c.table === 'help_requests');
      expect(helpRequestCalls.length).toBeGreaterThan(0);
      // Die update-Chain sollte 'matched' enthalten
      const updateCall = helpRequestCalls[0];
      const updateArgs = updateCall.args.flat();
      expect(updateArgs).toContainEqual('update');
      expect(updateArgs).toContainEqual({ status: 'matched' });
    });
  });
});
