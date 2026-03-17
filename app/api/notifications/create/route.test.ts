// app/api/notifications/create/route.test.ts
// Nachbar.io — H1 Negativtest: Notification Targeting
// Verifiziert dass checkUserRelationship() fremde Nutzer blockiert (403)
// Testet alle 4 Bedingungen: Admin, Haushalt, Caregiver-Link, gleiches Quartier

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { createRouteMockSupabase } from '@/lib/care/__tests__/mock-supabase';

// --- Mocks ---

const mockSupabase = createRouteMockSupabase();

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockImplementation(() => Promise.resolve(mockSupabase.supabase)),
}));

// Service-Client Mock (fuer INSERT nach Beziehungscheck)
const mockServiceInsert = vi.fn().mockResolvedValue({ data: null, error: null });
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      insert: mockServiceInsert,
    })),
  })),
}));

vi.mock('@/lib/notifications-server', () => ({
  safeInsertNotification: vi.fn().mockResolvedValue({ success: true, usedFallback: false }),
}));

import { POST } from './route';

// --- Helpers ---

const SENDER = { id: 'user-quarter-a', email: 'sender@test.de' };
const RECIPIENT_FOREIGN = 'user-quarter-b'; // Quartiersfremder Empfaenger

function createPostRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost:3000/api/notifications/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function validNotificationBody(overrides: Record<string, unknown> = {}) {
  return {
    userId: RECIPIENT_FOREIGN,
    type: 'message',
    title: 'Testnachricht',
    body: 'Inhalt',
    ...overrides,
  };
}

// --- H1: Negativtest — Quartiersfremder Empfaenger wird blockiert ---

describe('POST /api/notifications/create — H1 Beziehungscheck', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.reset();
    mockSupabase.setUser(SENDER);
  });

  describe('Authentifizierung', () => {
    it('gibt 401 zurueck ohne authentifizierten User', async () => {
      mockSupabase.setUser(null);

      const response = await POST(createPostRequest(validNotificationBody()));
      expect(response.status).toBe(401);
    });
  });

  describe('Validierung', () => {
    it('gibt 400 zurueck ohne Pflichtfelder', async () => {
      const response = await POST(createPostRequest({}));
      expect(response.status).toBe(400);
    });

    it('gibt 400 zurueck bei ungueltigem JSON', async () => {
      const request = new NextRequest('http://localhost:3000/api/notifications/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'KEIN JSON',
      });
      const response = await POST(request);
      expect(response.status).toBe(400);
    });

    it('ueberspringt Self-Notify (gibt ok+skipped zurueck)', async () => {
      const response = await POST(createPostRequest(validNotificationBody({ userId: SENDER.id })));
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.skipped).toBe(true);
    });
  });

  describe('H1 NEGATIVTEST — Quartiersfremder Empfaenger', () => {
    /**
     * Kerntest: User A (Quartier X) sendet an User B (Quartier Y)
     * Keine Beziehung: kein Admin, kein Haushalt, kein Caregiver-Link, anderes Quartier
     * Erwartung: 403 Forbidden
     */
    it('blockiert Notification an quartiersfremden User mit 403', async () => {
      // 1. Sender ist KEIN Admin
      mockSupabase.addResponse('users', {
        data: { is_admin: false, role: 'resident' },
        error: null,
      });

      // 2. Sender hat Haushalte — aber Empfaenger ist NICHT drin
      mockSupabase.addResponse('household_members', {
        data: [{ household_id: 'household-quarter-a' }],
        error: null,
      });
      mockSupabase.addResponse('household_members', {
        data: [], // Empfaenger NICHT im gleichen Haushalt
        error: null,
      });

      // 3. Kein Caregiver-Link
      mockSupabase.addResponse('caregiver_links', {
        data: [],
        error: null,
      });

      // 4. Sender hat Quartier A
      mockSupabase.addResponse('household_members', {
        data: { households: { quarter_id: 'quarter-a' } },
        error: null,
      });

      // 5. Empfaenger hat Quartier B (ANDERES Quartier)
      mockSupabase.addResponse('household_members', {
        data: { households: { quarter_id: 'quarter-b' } },
        error: null,
      });

      const response = await POST(createPostRequest(validNotificationBody()));
      expect(response.status).toBe(403);

      const body = await response.json();
      expect(body.error).toContain('Keine Berechtigung');
    });

    it('blockiert Notification wenn Sender keinem Haushalt angehoert', async () => {
      // 1. Kein Admin
      mockSupabase.addResponse('users', {
        data: { is_admin: false, role: 'resident' },
        error: null,
      });

      // 2. Sender hat KEINE Haushalte
      mockSupabase.addResponse('household_members', {
        data: [],
        error: null,
      });

      // 3. Kein Caregiver-Link
      mockSupabase.addResponse('caregiver_links', {
        data: [],
        error: null,
      });

      // 4. Sender-Quartier Query gibt null (kein Haushalt)
      mockSupabase.addResponse('household_members', {
        data: null,
        error: null,
      });

      const response = await POST(createPostRequest(validNotificationBody()));
      expect(response.status).toBe(403);
    });
  });

  describe('Positiv-Gegenproben (erlaubte Beziehungen)', () => {
    it('erlaubt Notification wenn Sender Admin ist', async () => {
      // Admin darf an alle senden
      mockSupabase.addResponse('users', {
        data: { is_admin: true, role: 'admin' },
        error: null,
      });

      const response = await POST(createPostRequest(validNotificationBody()));
      expect(response.status).toBe(200);
    });

    it('erlaubt Notification wenn Sender super_admin ist', async () => {
      mockSupabase.addResponse('users', {
        data: { is_admin: false, role: 'super_admin' },
        error: null,
      });

      const response = await POST(createPostRequest(validNotificationBody()));
      expect(response.status).toBe(200);
    });

    it('erlaubt Notification bei gleichem Haushalt', async () => {
      // 1. Kein Admin
      mockSupabase.addResponse('users', {
        data: { is_admin: false, role: 'resident' },
        error: null,
      });

      // 2. Sender hat Haushalt
      mockSupabase.addResponse('household_members', {
        data: [{ household_id: 'shared-household' }],
        error: null,
      });

      // 3. Empfaenger IST im gleichen Haushalt
      mockSupabase.addResponse('household_members', {
        data: [{ id: 'match' }],
        error: null,
      });

      const response = await POST(createPostRequest(validNotificationBody()));
      expect(response.status).toBe(200);
    });

    it('erlaubt Notification bei Caregiver-Link', async () => {
      // 1. Kein Admin
      mockSupabase.addResponse('users', {
        data: { is_admin: false, role: 'resident' },
        error: null,
      });

      // 2. Kein gemeinsamer Haushalt
      mockSupabase.addResponse('household_members', {
        data: [{ household_id: 'household-a' }],
        error: null,
      });
      mockSupabase.addResponse('household_members', {
        data: [],
        error: null,
      });

      // 3. Caregiver-Link existiert
      mockSupabase.addResponse('caregiver_links', {
        data: [{ id: 'link-1' }],
        error: null,
      });

      const response = await POST(createPostRequest(validNotificationBody()));
      expect(response.status).toBe(200);
    });

    it('erlaubt Notification bei gleichem Quartier', async () => {
      // 1. Kein Admin
      mockSupabase.addResponse('users', {
        data: { is_admin: false, role: 'resident' },
        error: null,
      });

      // 2. Kein gemeinsamer Haushalt
      mockSupabase.addResponse('household_members', {
        data: [{ household_id: 'household-a' }],
        error: null,
      });
      mockSupabase.addResponse('household_members', {
        data: [],
        error: null,
      });

      // 3. Kein Caregiver-Link
      mockSupabase.addResponse('caregiver_links', {
        data: [],
        error: null,
      });

      // 4. Sender Quartier A
      mockSupabase.addResponse('household_members', {
        data: { households: { quarter_id: 'quarter-same' } },
        error: null,
      });

      // 5. Empfaenger AUCH Quartier A (GLEICHES Quartier)
      mockSupabase.addResponse('household_members', {
        data: { households: { quarter_id: 'quarter-same' } },
        error: null,
      });

      const response = await POST(createPostRequest(validNotificationBody()));
      expect(response.status).toBe(200);
    });
  });
});
