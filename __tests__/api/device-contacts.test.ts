// __tests__/api/device-contacts.test.ts
// Tests fuer GET /api/device/contacts — Kontaktliste fuer Kiosk-Terminal

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// --- Mocks ---

// Mock authenticateDevice + isAuthError
const mockAuthenticateDevice = vi.fn();
const mockIsAuthError = vi.fn();

vi.mock('@/lib/device/auth', () => ({
  authenticateDevice: (...args: unknown[]) => mockAuthenticateDevice(...args),
  isAuthError: (...args: unknown[]) => mockIsAuthError(...args),
}));

// Sequenzielle from()-Aufrufe
function createMockSupabase(callResults: Array<{ data: unknown; error: unknown; count?: number }>) {
  let callIndex = 0;

  return {
    from: vi.fn().mockImplementation(() => {
      const response = callResults[callIndex] ?? { data: null, error: null };
      callIndex++;

      const chain: Record<string, unknown> = {};
      const terminalResult = Promise.resolve(response);

      chain.select = vi.fn().mockReturnValue(chain);
      chain.eq = vi.fn().mockReturnValue(chain);
      chain.in = vi.fn().mockReturnValue(chain);
      chain.is = vi.fn().mockReturnValue(chain);
      chain.not = vi.fn().mockReturnValue(chain);
      chain.order = vi.fn().mockReturnValue(chain);
      chain.limit = vi.fn().mockReturnValue(chain);
      chain.maybeSingle = vi.fn().mockReturnValue(terminalResult);
      chain.single = vi.fn().mockReturnValue(terminalResult);
      chain.then = terminalResult.then.bind(terminalResult);

      return chain;
    }),
  };
}

// --- Hilfsfunktion ---
function makeRequest(token?: string): NextRequest {
  const url = new URL('http://localhost/api/device/contacts');
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return new NextRequest(url, { method: 'GET', headers });
}

// --- Tests ---

describe('GET /api/device/contacts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('gibt 401 bei fehlender/ungueltiger Authentifizierung', async () => {
    const { NextResponse } = await import('next/server');
    const errorResponse = NextResponse.json({ error: 'Ungueltiger Token' }, { status: 401 });

    mockAuthenticateDevice.mockResolvedValue(errorResponse);
    mockIsAuthError.mockReturnValue(true);

    const { GET } = await import('@/app/api/device/contacts/route');
    const response = await GET(makeRequest());

    expect(response.status).toBe(401);
  });

  it('gibt leere Kontaktliste wenn keine Caregiver-Links existieren', async () => {
    const supabase = createMockSupabase([
      // 1. household_members: Bewohner gefunden
      { data: [{ user_id: 'resident-1' }], error: null },
      // 2. caregiver_links: keine Links
      { data: [], error: null },
    ]);

    mockAuthenticateDevice.mockResolvedValue({
      device: { id: 'dev-1', household_id: 'hh-1' },
      supabase,
    });
    mockIsAuthError.mockReturnValue(false);

    const { GET } = await import('@/app/api/device/contacts/route');
    const response = await GET(makeRequest('valid-token-1234567890'));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.contacts).toEqual([]);
  });

  it('gibt Kontaktliste mit Caregiver-Daten zurueck', async () => {
    const supabase = createMockSupabase([
      // 1. household_members
      { data: [{ user_id: 'resident-1' }], error: null },
      // 2. caregiver_links mit User-Join
      {
        data: [
          {
            id: 'link-1',
            caregiver_id: 'cg-1',
            auto_answer_allowed: true,
            auto_answer_start: '08:00',
            auto_answer_end: '20:00',
            users: { display_name: 'Lisa Mueller', avatar_url: 'https://example.com/lisa.jpg' },
          },
          {
            id: 'link-2',
            caregiver_id: 'cg-2',
            auto_answer_allowed: false,
            auto_answer_start: '09:00',
            auto_answer_end: '18:00',
            users: { display_name: 'Max Schmidt', avatar_url: null },
          },
        ],
        error: null,
      },
    ]);

    mockAuthenticateDevice.mockResolvedValue({
      device: { id: 'dev-1', household_id: 'hh-1' },
      supabase,
    });
    mockIsAuthError.mockReturnValue(false);

    const { GET } = await import('@/app/api/device/contacts/route');
    const response = await GET(makeRequest('valid-token-1234567890'));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.contacts).toHaveLength(2);
    expect(json.contacts[0]).toEqual({
      id: 'link-1',
      caregiver_id: 'cg-1',
      caregiver_name: 'Lisa Mueller',
      caregiver_avatar: 'https://example.com/lisa.jpg',
      auto_answer_allowed: true,
      auto_answer_start: '08:00',
      auto_answer_end: '20:00',
    });
    expect(json.contacts[1].caregiver_name).toBe('Max Schmidt');
    expect(json.contacts[1].caregiver_avatar).toBeNull();
  });

  it('gibt leere Kontaktliste wenn kein Bewohner im Haushalt', async () => {
    const supabase = createMockSupabase([
      // 1. household_members: niemand
      { data: [], error: null },
      // 2. caregiver_links: keine residentIds → leer
      { data: [], error: null },
    ]);

    mockAuthenticateDevice.mockResolvedValue({
      device: { id: 'dev-1', household_id: 'hh-1' },
      supabase,
    });
    mockIsAuthError.mockReturnValue(false);

    const { GET } = await import('@/app/api/device/contacts/route');
    const response = await GET(makeRequest('valid-token-1234567890'));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.contacts).toEqual([]);
  });
});
