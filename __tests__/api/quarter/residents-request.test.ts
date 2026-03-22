// __tests__/api/quarter/residents-request.test.ts
// Nachbar.io — Tests fuer POST /api/quarter/residents/request
// Kontaktanfrage mit Spam-Schutz und Hash-Aufloesung

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { createRouteMockSupabase } from '@/lib/care/__tests__/mock-supabase';

// --- Mocks ---

const mockSupabase = createRouteMockSupabase();

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockImplementation(() => Promise.resolve(mockSupabase.supabase)),
}));

// Globaler fetch-Mock fuer Notification (fire-and-forget)
const originalFetch = globalThis.fetch;
beforeEach(() => {
  globalThis.fetch = vi.fn().mockResolvedValue({ ok: true });
});
import { afterAll } from 'vitest';
afterAll(() => {
  globalThis.fetch = originalFetch;
});

import { POST } from '@/app/api/quarter/residents/request/route';

// --- Konstanten ---

const USER_ID = 'user-requester-1';
const TARGET_USER = 'user-target-1';
const HOUSEHOLD_ID = 'household-target-1';

function createPostRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost:3000/api/quarter/residents/request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

// Hilfsfunktion: Hash aus der Route nachbilden (fuer Target-Aufloesung)
function hashUserId(userId: string): string {
  // Wird zur Laufzeit berechnet — wir testen, dass die Route den Hash korrekt matched
  const crypto = require('crypto');
  const secret = process.env.RESIDENT_HASH_SECRET || 'nachbar-io-resident-hash-2026';
  return crypto.createHmac('sha256', secret).update(userId).digest('hex').slice(0, 16);
}

// --- Tests ---

describe('POST /api/quarter/residents/request', () => {
  beforeEach(() => {
    mockSupabase.reset();
  });

  it('gibt 401 zurueck wenn nicht authentifiziert', async () => {
    const res = await POST(createPostRequest({
      hashedId: 'abc123',
      householdId: HOUSEHOLD_ID,
      message: 'Hallo',
    }));
    expect(res.status).toBe(401);
  });

  it('gibt 400 zurueck wenn Nachricht fehlt', async () => {
    mockSupabase.setUser({ id: USER_ID, email: 'test@test.de' });

    const res = await POST(createPostRequest({
      hashedId: 'abc123',
      householdId: HOUSEHOLD_ID,
      message: '',
    }));
    expect(res.status).toBe(400);
  });

  it('gibt 400 zurueck wenn Nachricht zu lang ist (>500 Zeichen)', async () => {
    mockSupabase.setUser({ id: USER_ID, email: 'test@test.de' });

    const res = await POST(createPostRequest({
      hashedId: 'abc123',
      householdId: HOUSEHOLD_ID,
      message: 'x'.repeat(501),
    }));
    expect(res.status).toBe(400);
  });

  it('gibt 429 zurueck wenn 3+ ausstehende Anfragen bestehen', async () => {
    mockSupabase.setUser({ id: USER_ID, email: 'test@test.de' });

    // neighbor_connections count: 3 pending
    mockSupabase.addResponse('neighbor_connections', {
      data: null,
      error: null,
      // Der Mock consumiert die Response — count wird als Objekt-Eigenschaft gebraucht
    });

    // Wir muessen den Mock so aufbauen, dass count=3 zurueckkommt
    // Da der Proxy-Mock alles durchleitet, setzen wir die Response mit count
    mockSupabase.reset();
    mockSupabase.setUser({ id: USER_ID, email: 'test@test.de' });

    // Spam-Check: count >= 3
    mockSupabase.addResponse('neighbor_connections', {
      data: null,
      error: null,
      count: 3,
    } as unknown as { data: unknown; error: unknown });

    const res = await POST(createPostRequest({
      hashedId: hashUserId(TARGET_USER),
      householdId: HOUSEHOLD_ID,
      message: 'Hallo Nachbar!',
    }));
    expect(res.status).toBe(429);
  });

  it('gibt 404 zurueck wenn Hash keinen Bewohner findet', async () => {
    mockSupabase.setUser({ id: USER_ID, email: 'test@test.de' });

    // 1. Spam-Check: 0 pending
    mockSupabase.addResponse('neighbor_connections', {
      data: null,
      error: null,
      count: 0,
    } as unknown as { data: unknown; error: unknown });

    // 2. household_members: Bewohner des Haushalts laden
    mockSupabase.addResponse('household_members', {
      data: [
        { user_id: TARGET_USER, household_id: HOUSEHOLD_ID },
      ],
      error: null,
    });

    const res = await POST(createPostRequest({
      hashedId: 'nonexistent12345',  // passt auf keinen Hash
      householdId: HOUSEHOLD_ID,
      message: 'Hallo!',
    }));
    expect(res.status).toBe(404);
  });

  it('erstellt erfolgreich eine Kontaktanfrage', async () => {
    mockSupabase.setUser({ id: USER_ID, email: 'test@test.de' });

    const targetHash = hashUserId(TARGET_USER);

    // 1. Spam-Check: 0 pending
    mockSupabase.addResponse('neighbor_connections', {
      data: null,
      error: null,
      count: 0,
    } as unknown as { data: unknown; error: unknown });

    // 2. household_members: Bewohner des Haushalts
    mockSupabase.addResponse('household_members', {
      data: [
        { user_id: TARGET_USER, household_id: HOUSEHOLD_ID },
      ],
      error: null,
    });

    // 3. neighbor_connections INSERT: Erfolg
    mockSupabase.addResponse('neighbor_connections', {
      data: { id: 'connection-new-1' },
      error: null,
    });

    const res = await POST(createPostRequest({
      hashedId: targetHash,
      householdId: HOUSEHOLD_ID,
      message: 'Hallo, bin Ihr Nachbar von nebenan!',
    }));

    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.connectionId).toBe('connection-new-1');
  });
});
