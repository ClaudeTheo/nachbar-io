// __tests__/api/quarter/residents.test.ts
// Nachbar.io — Tests fuer GET /api/quarter/residents
// Anonymisierte Bewohnerliste fuer Chat-Anfrage-Browser

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { createRouteMockSupabase } from '@/lib/care/__tests__/mock-supabase';

// --- Mocks ---

const mockSupabase = createRouteMockSupabase();

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockImplementation(() => Promise.resolve(mockSupabase.supabase)),
}));

import { GET } from '@/app/api/quarter/residents/route';

// --- Konstanten ---

const USER_ID = 'user-abc-123';
const USER_HOUSEHOLD = 'household-own-1';
const QUARTER_ID = 'quarter-pilot-1';
const OTHER_HOUSEHOLD = 'household-other-1';
const OTHER_USER_1 = 'user-other-1';
const OTHER_USER_2 = 'user-other-2';
const CONNECTED_USER = 'user-connected-1';
const PENDING_USER = 'user-pending-1';

function createGetRequest(): NextRequest {
  return new NextRequest('http://localhost:3000/api/quarter/residents', {
    method: 'GET',
  });
}

// --- Tests ---

describe('GET /api/quarter/residents', () => {
  beforeEach(() => {
    mockSupabase.reset();
  });

  it('gibt 401 zurueck wenn nicht authentifiziert', async () => {
    // Kein User gesetzt → auth.getUser gibt null zurueck
    const res = await GET(createGetRequest());
    expect(res.status).toBe(401);
  });

  it('gibt leere Liste zurueck wenn User keinem Haushalt zugeordnet ist', async () => {
    mockSupabase.setUser({ id: USER_ID, email: 'test@test.de' });

    // household_members: User hat keinen Haushalt
    mockSupabase.addResponse('household_members', {
      data: null,
      error: null,
    });

    const res = await GET(createGetRequest());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.addresses).toEqual([]);
  });

  it('filtert eigenen Haushalt heraus', async () => {
    mockSupabase.setUser({ id: USER_ID, email: 'test@test.de' });

    // 1. household_members → eigener Haushalt + quarter_id
    mockSupabase.addResponse('household_members', {
      data: { household_id: USER_HOUSEHOLD, households: { quarter_id: QUARTER_ID } },
      error: null,
    });

    // 2. households → alle Haushalte im Quartier (inkl. eigener)
    mockSupabase.addResponse('households', {
      data: [
        { id: USER_HOUSEHOLD, street_name: 'Purkersdorfer Straße', house_number: '33' },
        { id: OTHER_HOUSEHOLD, street_name: 'Purkersdorfer Straße', house_number: '35' },
      ],
      error: null,
    });

    // 3. household_members → alle Mitglieder der fremden Haushalte
    mockSupabase.addResponse('household_members', {
      data: [
        { household_id: OTHER_HOUSEHOLD, user_id: OTHER_USER_1 },
        { household_id: OTHER_HOUSEHOLD, user_id: OTHER_USER_2 },
      ],
      error: null,
    });

    // 4. neighbor_connections → keine bestehenden Verbindungen
    mockSupabase.addResponse('neighbor_connections', {
      data: [],
      error: null,
    });

    const res = await GET(createGetRequest());
    expect(res.status).toBe(200);
    const json = await res.json();

    // Nur der andere Haushalt sollte erscheinen, nicht der eigene
    expect(json.addresses).toHaveLength(1);
    expect(json.addresses[0].address).toBe('Purkersdorfer Straße 35');
    expect(json.addresses[0].residents).toHaveLength(2);
  });

  it('filtert verbundene und ausstehende Anfragen heraus', async () => {
    mockSupabase.setUser({ id: USER_ID, email: 'test@test.de' });

    // 1. Eigener Haushalt
    mockSupabase.addResponse('household_members', {
      data: { household_id: USER_HOUSEHOLD, households: { quarter_id: QUARTER_ID } },
      error: null,
    });

    // 2. Haushalte im Quartier
    mockSupabase.addResponse('households', {
      data: [
        { id: OTHER_HOUSEHOLD, street_name: 'Sanarystraße', house_number: '12' },
      ],
      error: null,
    });

    // 3. Mitglieder: 3 User (einer connected, einer pending, einer frei)
    mockSupabase.addResponse('household_members', {
      data: [
        { household_id: OTHER_HOUSEHOLD, user_id: CONNECTED_USER },
        { household_id: OTHER_HOUSEHOLD, user_id: PENDING_USER },
        { household_id: OTHER_HOUSEHOLD, user_id: OTHER_USER_1 },
      ],
      error: null,
    });

    // 4. neighbor_connections → einer accepted, einer pending
    mockSupabase.addResponse('neighbor_connections', {
      data: [
        { requester_id: USER_ID, target_id: CONNECTED_USER, status: 'accepted' },
        { requester_id: USER_ID, target_id: PENDING_USER, status: 'pending' },
      ],
      error: null,
    });

    const res = await GET(createGetRequest());
    expect(res.status).toBe(200);
    const json = await res.json();

    // Nur 1 Bewohner (OTHER_USER_1) sollte sichtbar sein
    expect(json.addresses[0].residents).toHaveLength(1);
  });

  it('gibt gehashte IDs zurueck, die nicht den echten UUIDs entsprechen', async () => {
    mockSupabase.setUser({ id: USER_ID, email: 'test@test.de' });

    // 1. Eigener Haushalt
    mockSupabase.addResponse('household_members', {
      data: { household_id: USER_HOUSEHOLD, households: { quarter_id: QUARTER_ID } },
      error: null,
    });

    // 2. Haushalte
    mockSupabase.addResponse('households', {
      data: [
        { id: OTHER_HOUSEHOLD, street_name: 'Oberer Rebberg', house_number: '7' },
      ],
      error: null,
    });

    // 3. Mitglieder
    mockSupabase.addResponse('household_members', {
      data: [
        { household_id: OTHER_HOUSEHOLD, user_id: OTHER_USER_1 },
      ],
      error: null,
    });

    // 4. Keine Verbindungen
    mockSupabase.addResponse('neighbor_connections', {
      data: [],
      error: null,
    });

    const res = await GET(createGetRequest());
    const json = await res.json();

    const resident = json.addresses[0].residents[0];
    // Gehashte ID ist 16 Zeichen Hex
    expect(resident.id).toHaveLength(16);
    expect(resident.id).toMatch(/^[0-9a-f]{16}$/);
    // Darf NICHT die echte UUID sein
    expect(resident.id).not.toBe(OTHER_USER_1);
    // Hat eine Nummer
    expect(resident.number).toBe(1);
  });
});
