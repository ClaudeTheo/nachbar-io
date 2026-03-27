// __tests__/api/hilfe/receipt.test.ts
// Nachbar Hilfe — Tests fuer Quittungs-API (POST + GET)

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { createRouteMockSupabase } from '@/lib/care/__tests__/mock-supabase';
import type { NextRequest } from 'next/server';

const mockSupabase = createRouteMockSupabase();

// Storage-Mock erweitern
const mockUpload = vi.fn().mockResolvedValue({ error: null });
const mockGetPublicUrl = vi.fn().mockReturnValue({
  data: { publicUrl: 'https://storage.example.com/receipts/hilfe/receipt_test.pdf' },
});

// Storage auf dem Mock-Client hinzufuegen
(mockSupabase.supabase as unknown as Record<string, unknown>).storage = {
  from: vi.fn().mockReturnValue({
    upload: mockUpload,
    getPublicUrl: mockGetPublicUrl,
  }),
};

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockImplementation(() => Promise.resolve(mockSupabase.supabase)),
}));

const MOCK_BODY = {
  resident: {
    name: 'Helga Mueller',
    address: 'Purkersdorfer Strasse 12, 79713 Bad Saeckingen',
    insurance_name: 'AOK Baden-Wuerttemberg',
    insurance_number: 'A123456789',
    care_level: 2,
  },
  helper: {
    name: 'Thomas Schmidt',
    address: 'Sanarystrasse 5, 79713 Bad Saeckingen',
    date_of_birth: '1990-05-15',
  },
};

function makePostRequest(body: Record<string, unknown>): NextRequest {
  return new Request('http://localhost/api/hilfe/sessions/session-1/receipt', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }) as unknown as NextRequest;
}

function makeGetRequest(): NextRequest {
  const req = new Request('http://localhost/api/hilfe/sessions/session-1/receipt', {
    method: 'GET',
  });
  Object.defineProperty(req, 'nextUrl', {
    value: new URL('http://localhost/api/hilfe/sessions/session-1/receipt'),
  });
  return req as unknown as NextRequest;
}

function makeContext(id = 'session-1') {
  return { params: Promise.resolve({ id }) };
}

describe('/api/hilfe/sessions/[id]/receipt', () => {
  beforeEach(() => {
    mockSupabase.reset();
    // Storage-Mock nach Reset wiederherstellen
    (mockSupabase.supabase as unknown as Record<string, unknown>).storage = {
      from: vi.fn().mockReturnValue({
        upload: mockUpload,
        getPublicUrl: mockGetPublicUrl,
      }),
    };
    mockUpload.mockResolvedValue({ error: null });
    vi.clearAllMocks();
  });

  describe('POST', () => {
    it('gibt 401 zurueck ohne Authentifizierung', async () => {
      const { POST } = await import('@/app/api/hilfe/sessions/[id]/receipt/route');
      const response = await POST(makePostRequest(MOCK_BODY), makeContext());
      expect(response.status).toBe(401);
    });

    it('generiert Quittung und gibt 201 zurueck', async () => {
      mockSupabase.setUser({ id: 'user-1', email: 'test@test.de' });

      // Session-Abfrage (signed Status)
      mockSupabase.addResponse('help_sessions', {
        data: {
          id: 'session-1',
          match_id: 'match-1',
          session_date: '2026-03-25',
          start_time: '10:00',
          end_time: '12:00',
          duration_minutes: 120,
          activity_category: 'einkaufen',
          activity_description: 'Wocheneinkauf',
          hourly_rate_cents: 1500,
          total_amount_cents: 3000,
          helper_signature_url: null,
          resident_signature_url: null,
          status: 'signed',
        },
        error: null,
      });

      // help_receipts Insert
      mockSupabase.addResponse('help_receipts', {
        data: {
          id: 'receipt-1',
          session_id: 'session-1',
          pdf_url: 'https://storage.example.com/receipts/hilfe/receipt_test.pdf',
          submitted_to_insurer: false,
        },
        error: null,
      });

      // help_sessions Update (status → receipt_created)
      mockSupabase.addResponse('help_sessions', { data: null, error: null });

      const { POST } = await import('@/app/api/hilfe/sessions/[id]/receipt/route');
      const response = await POST(makePostRequest(MOCK_BODY), makeContext());
      expect(response.status).toBe(201);

      const body = await response.json();
      expect(body.pdf_url).toBeDefined();
      expect(body.receipt_id).toBe('receipt-1');
    });
  });

  describe('GET', () => {
    it('gibt Quittungsinformationen zurueck', async () => {
      mockSupabase.setUser({ id: 'user-1', email: 'test@test.de' });
      mockSupabase.addResponse('help_receipts', {
        data: {
          id: 'receipt-1',
          session_id: 'session-1',
          pdf_url: 'https://storage.example.com/receipts/hilfe/receipt_test.pdf',
          submitted_to_insurer: false,
          submitted_at: null,
          created_at: '2026-03-25T14:00:00Z',
        },
        error: null,
      });

      const { GET } = await import('@/app/api/hilfe/sessions/[id]/receipt/route');
      const response = await GET(makeGetRequest(), makeContext());
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.id).toBe('receipt-1');
      expect(body.pdf_url).toContain('receipt_test.pdf');
    });
  });
});
