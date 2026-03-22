// __tests__/api/quarter/residents-request.test.ts
// Nachbar.io — Tests fuer POST /api/quarter/residents/request
// Kontaktanfrage mit Spam-Schutz, Hash-Aufloesung und Quarter-Scope-Validierung

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
import { hashUserId, hashHouseholdId } from '@/lib/quarter/resident-hash';

// --- Konstanten ---

const USER_ID = 'user-requester-1';
const TARGET_USER = 'user-target-1';
const HOUSEHOLD_ID = 'household-target-1';
const REQUESTER_HOUSEHOLD = 'household-requester-1';
const QUARTER_ID = 'quarter-pilot-1';

function createPostRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost:3000/api/quarter/residents/request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

/** Setzt die Standard-Mocks fuer Spam-Check + Quarter-Scope + Household-Members */
function setupSuccessPath(opts?: { pendingCount?: number }) {
  const count = opts?.pendingCount ?? 0;

  // 1. Spam-Check: neighbor_connections count
  mockSupabase.addResponse('neighbor_connections', {
    data: null,
    error: null,
    count,
  } as unknown as { data: unknown; error: unknown });

  // 2. Quarter-Scope: requester's household_members → household + quarter
  mockSupabase.addResponse('household_members', {
    data: { household_id: REQUESTER_HOUSEHOLD, households: { quarter_id: QUARTER_ID } },
    error: null,
  });

  // 3. Alle Haushalte im Quartier
  mockSupabase.addResponse('households', {
    data: [
      { id: HOUSEHOLD_ID },
      { id: REQUESTER_HOUSEHOLD },
    ],
    error: null,
  });

  // 4. Bewohner des Ziel-Haushalts
  mockSupabase.addResponse('household_members', {
    data: [
      { user_id: TARGET_USER },
    ],
    error: null,
  });
}

// --- Tests ---

describe('POST /api/quarter/residents/request', () => {
  beforeEach(() => {
    mockSupabase.reset();
  });

  it('gibt 401 zurueck wenn nicht authentifiziert', async () => {
    const res = await POST(createPostRequest({
      hashedId: 'abc123',
      householdId: hashHouseholdId(HOUSEHOLD_ID),
      message: 'Hallo',
    }));
    expect(res.status).toBe(401);
  });

  it('gibt 400 zurueck wenn Nachricht fehlt', async () => {
    mockSupabase.setUser({ id: USER_ID, email: 'test@test.de' });

    const res = await POST(createPostRequest({
      hashedId: 'abc123',
      householdId: hashHouseholdId(HOUSEHOLD_ID),
      message: '',
    }));
    expect(res.status).toBe(400);
  });

  it('gibt 400 zurueck wenn Nachricht zu lang ist (>500 Zeichen)', async () => {
    mockSupabase.setUser({ id: USER_ID, email: 'test@test.de' });

    const res = await POST(createPostRequest({
      hashedId: 'abc123',
      householdId: hashHouseholdId(HOUSEHOLD_ID),
      message: 'x'.repeat(501),
    }));
    expect(res.status).toBe(400);
  });

  it('gibt 429 zurueck wenn 3+ ausstehende Anfragen bestehen', async () => {
    mockSupabase.setUser({ id: USER_ID, email: 'test@test.de' });

    // Spam-Check: count >= 3
    mockSupabase.addResponse('neighbor_connections', {
      data: null,
      error: null,
      count: 3,
    } as unknown as { data: unknown; error: unknown });

    const res = await POST(createPostRequest({
      hashedId: hashUserId(TARGET_USER),
      householdId: hashHouseholdId(HOUSEHOLD_ID),
      message: 'Hallo Nachbar!',
    }));
    expect(res.status).toBe(429);
  });

  it('gibt 404 zurueck wenn Hash keinen Bewohner findet', async () => {
    mockSupabase.setUser({ id: USER_ID, email: 'test@test.de' });

    setupSuccessPath();

    const res = await POST(createPostRequest({
      hashedId: 'nonexistent12345',  // passt auf keinen Hash
      householdId: hashHouseholdId(HOUSEHOLD_ID),
      message: 'Hallo!',
    }));
    expect(res.status).toBe(404);
  });

  it('gibt 404 zurueck wenn Haushalt nicht im eigenen Quartier liegt', async () => {
    mockSupabase.setUser({ id: USER_ID, email: 'test@test.de' });

    // 1. Spam-Check: 0 pending
    mockSupabase.addResponse('neighbor_connections', {
      data: null,
      error: null,
      count: 0,
    } as unknown as { data: unknown; error: unknown });

    // 2. Requester's quarter
    mockSupabase.addResponse('household_members', {
      data: { household_id: REQUESTER_HOUSEHOLD, households: { quarter_id: QUARTER_ID } },
      error: null,
    });

    // 3. Haushalte im Quartier — Ziel-Haushalt ist NICHT darin
    mockSupabase.addResponse('households', {
      data: [
        { id: REQUESTER_HOUSEHOLD },
        { id: 'household-other-same-quarter' },
      ],
      error: null,
    });

    const res = await POST(createPostRequest({
      hashedId: hashUserId(TARGET_USER),
      householdId: hashHouseholdId('household-foreign-quarter'),  // nicht im Quartier
      message: 'Hallo!',
    }));
    expect(res.status).toBe(404);
  });

  it('erstellt erfolgreich eine Kontaktanfrage', async () => {
    mockSupabase.setUser({ id: USER_ID, email: 'test@test.de' });

    const targetHash = hashUserId(TARGET_USER);
    const householdHash = hashHouseholdId(HOUSEHOLD_ID);

    setupSuccessPath();

    // 5. neighbor_connections INSERT: Erfolg
    mockSupabase.addResponse('neighbor_connections', {
      data: { id: 'connection-new-1' },
      error: null,
    });

    const res = await POST(createPostRequest({
      hashedId: targetHash,
      householdId: householdHash,
      message: 'Hallo, bin Ihr Nachbar von nebenan!',
    }));

    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.connectionId).toBe('connection-new-1');
  });
});
