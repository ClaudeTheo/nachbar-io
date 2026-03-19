// __tests__/lib/analytics.test.ts
// Tests fuer die Analytics-Bibliothek (KPI-Berechnung pro Quartier)

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { calculateQuarterSnapshot, saveSnapshot, type AnalyticsSnapshot } from '@/lib/analytics';
import type { SupabaseClient } from '@supabase/supabase-js';

// --- Supabase Mock ---

// Erstellt ein thenable Chain-Objekt fuer Supabase-Query-Mocking
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function makeThenableChain(returnValue: any): any {
  const handler = {
    get(_target: object, prop: string) {
      if (prop === 'then') {
        return (resolve: (v: unknown) => void) => {
          resolve(returnValue);
          return new Proxy({}, handler);
        };
      }
      // Jede Methode (select, eq, in, gte, upsert, ...) gibt Proxy zurueck
      return vi.fn().mockReturnValue(new Proxy({}, handler));
    },
  };
  return new Proxy({}, handler);
}

// Erstellt einen Mock-Supabase-Client mit konfigurierbaren Tabellen-Antworten
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createMockSupabase(tableResponses: Record<string, any>): SupabaseClient {
  return {
    from: vi.fn((table: string) => {
      const response = tableResponses[table] ?? { data: [], count: 0, error: null };
      return makeThenableChain(response);
    }),
  } as unknown as SupabaseClient;
}

// Typ fuer eine Mock-Tabellen-Antwort
interface MockTableResponse {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any[] | null;
  count: number | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  error: any;
}

// Standard-Antworten fuer alle Tabellen (leeres Quartier)
function emptyTableResponses(): Record<string, MockTableResponse> {
  return {
    households: { data: [], count: 0, error: null },
    household_members: { data: [], count: 0, error: null },
    users: { data: [], count: 0, error: null },
    help_requests: { data: [], count: 0, error: null },
    events: { data: [], count: 0, error: null },
    event_participants: { data: [], count: 0, error: null },
    heartbeats: { data: [], count: 0, error: null },
    escalation_events: { data: [], count: 0, error: null },
    care_subscriptions: { data: [], count: 0, error: null },
    organizations: { data: [], count: 0, error: null },
    analytics_snapshots: { data: null, count: null, error: null },
  };
}

const TEST_QUARTER_ID = 'quarter-test-001';
const TEST_DATE = new Date('2026-03-19T10:00:00Z');

describe('Analytics-Bibliothek', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('calculateQuarterSnapshot', () => {
    it('gibt korrekten WAH-Wert zurueck wenn Haushalte aktive Nutzer haben', async () => {
      // Setup: 2 Haushalte, 3 Nutzer, davon 2 aktiv (in 2 verschiedenen Haushalten)
      const responses = emptyTableResponses();
      responses.households = {
        data: [{ id: 'h1' }, { id: 'h2' }],
        count: 2,
        error: null,
      };
      responses.household_members = {
        data: [
          { user_id: 'u1', household_id: 'h1' },
          { user_id: 'u2', household_id: 'h1' },
          { user_id: 'u3', household_id: 'h2' },
        ],
        count: 3,
        error: null,
      };
      responses.users = {
        data: [{ id: 'u1' }, { id: 'u3' }], // u1 und u3 aktiv (verschiedene Haushalte)
        count: 2,
        error: null,
      };

      const supabase = createMockSupabase(responses);
      const snapshot = await calculateQuarterSnapshot(supabase, TEST_QUARTER_ID, TEST_DATE);

      // WAH = 2 (Haushalt h1 hat u1 aktiv, h2 hat u3 aktiv)
      expect(snapshot.wah).toBe(2);
      expect(snapshot.quarter_id).toBe(TEST_QUARTER_ID);
      expect(snapshot.snapshot_date).toBe('2026-03-19');
    });

    it('gibt 0 fuer alle Metriken zurueck bei inaktivem Quartier', async () => {
      const responses = emptyTableResponses();
      const supabase = createMockSupabase(responses);
      const snapshot = await calculateQuarterSnapshot(supabase, TEST_QUARTER_ID, TEST_DATE);

      expect(snapshot.wah).toBe(0);
      expect(snapshot.total_users).toBe(0);
      expect(snapshot.active_users_7d).toBe(0);
      expect(snapshot.active_users_30d).toBe(0);
      expect(snapshot.posts_count).toBe(0);
      expect(snapshot.events_count).toBe(0);
      expect(snapshot.rsvp_count).toBe(0);
      expect(snapshot.heartbeat_coverage).toBe(0);
      expect(snapshot.escalation_count).toBe(0);
      expect(snapshot.plus_subscribers).toBe(0);
      expect(snapshot.active_orgs).toBe(0);
      expect(snapshot.mrr).toBe(0);
    });

    it('berechnet heartbeat_coverage korrekt als Prozentsatz', async () => {
      // Setup: 4 Nutzer, davon 2 mit Heartbeat in den letzten 24h = 50%
      const responses = emptyTableResponses();
      responses.households = {
        data: [{ id: 'h1' }],
        count: 1,
        error: null,
      };
      responses.household_members = {
        data: [
          { user_id: 'u1', household_id: 'h1' },
          { user_id: 'u2', household_id: 'h1' },
          { user_id: 'u3', household_id: 'h1' },
          { user_id: 'u4', household_id: 'h1' },
        ],
        count: 4,
        error: null,
      };
      responses.heartbeats = {
        data: [
          { user_id: 'u1' },
          { user_id: 'u3' },
        ],
        count: 2,
        error: null,
      };
      // Users-Abfrage: alle 4 als aktiv (fuer active_users_7d)
      responses.users = {
        data: [{ id: 'u1' }, { id: 'u2' }, { id: 'u3' }, { id: 'u4' }],
        count: 4,
        error: null,
      };

      const supabase = createMockSupabase(responses);
      const snapshot = await calculateQuarterSnapshot(supabase, TEST_QUARTER_ID, TEST_DATE);

      // 2 von 4 Nutzern haben Heartbeat = 50%
      expect(snapshot.heartbeat_coverage).toBe(50);
    });

    it('setzt snapshot_date auf das aktuelle Datum', async () => {
      const responses = emptyTableResponses();
      const supabase = createMockSupabase(responses);
      const customDate = new Date('2026-06-15T08:30:00Z');
      const snapshot = await calculateQuarterSnapshot(supabase, TEST_QUARTER_ID, customDate);

      expect(snapshot.snapshot_date).toBe('2026-06-15');
    });

    it('berechnet retention_7d korrekt', async () => {
      // 10 Nutzer insgesamt, 3 aktiv in letzten 7 Tagen = 30%
      const responses = emptyTableResponses();
      responses.households = {
        data: [{ id: 'h1' }],
        count: 1,
        error: null,
      };
      // 10 Mitglieder
      const members = Array.from({ length: 10 }, (_, i) => ({
        user_id: `u${i}`,
        household_id: 'h1',
      }));
      responses.household_members = {
        data: members,
        count: 10,
        error: null,
      };
      // 3 aktive Nutzer
      responses.users = {
        data: [{ id: 'u0' }, { id: 'u1' }, { id: 'u2' }],
        count: 3,
        error: null,
      };

      const supabase = createMockSupabase(responses);
      const snapshot = await calculateQuarterSnapshot(supabase, TEST_QUARTER_ID, TEST_DATE);

      expect(snapshot.retention_7d).toBe(30);
    });
  });

  describe('saveSnapshot', () => {
    it('ruft upsert mit korrekten Daten auf', async () => {
      const mockUpsert = vi.fn().mockResolvedValue({ data: null, error: null });
      const supabase = {
        from: vi.fn(() => ({
          upsert: mockUpsert,
        })),
      } as unknown as SupabaseClient;

      const snapshot: AnalyticsSnapshot = {
        quarter_id: TEST_QUARTER_ID,
        snapshot_date: '2026-03-19',
        wah: 5,
        total_users: 20,
        active_users_7d: 12,
        active_users_30d: 18,
        new_registrations: 0,
        activation_rate: 0,
        retention_7d: 60,
        retention_30d: 90,
        invite_sent: 0,
        invite_converted: 0,
        invite_conversion_rate: 0,
        posts_count: 3,
        events_count: 1,
        rsvp_count: 7,
        plus_subscribers: 2,
        heartbeat_coverage: 75,
        checkin_frequency: 0,
        escalation_count: 0,
        active_orgs: 1,
        mrr: 0,
      };

      await saveSnapshot(supabase, snapshot);

      expect(supabase.from).toHaveBeenCalledWith('analytics_snapshots');
      expect(mockUpsert).toHaveBeenCalledWith(snapshot, {
        onConflict: 'quarter_id,snapshot_date',
      });
    });

    it('wirft Fehler wenn upsert fehlschlaegt', async () => {
      const mockUpsert = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'DB-Verbindungsfehler' },
      });
      const supabase = {
        from: vi.fn(() => ({
          upsert: mockUpsert,
        })),
      } as unknown as SupabaseClient;

      const snapshot: AnalyticsSnapshot = {
        quarter_id: TEST_QUARTER_ID,
        snapshot_date: '2026-03-19',
        wah: 0,
        total_users: 0,
        active_users_7d: 0,
        active_users_30d: 0,
        new_registrations: 0,
        activation_rate: 0,
        retention_7d: 0,
        retention_30d: 0,
        invite_sent: 0,
        invite_converted: 0,
        invite_conversion_rate: 0,
        posts_count: 0,
        events_count: 0,
        rsvp_count: 0,
        plus_subscribers: 0,
        heartbeat_coverage: 0,
        checkin_frequency: 0,
        escalation_count: 0,
        active_orgs: 0,
        mrr: 0,
      };

      await expect(saveSnapshot(supabase, snapshot)).rejects.toThrow(
        'Analytics-Snapshot konnte nicht gespeichert werden: DB-Verbindungsfehler'
      );
    });
  });
});
