import { describe, it, expect, vi, beforeEach } from 'vitest';

// Supabase Server-Client mocken
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

import { isWriteTool, executeCompanionTool } from '@/lib/companion/tool-executor';
import { createClient } from '@/lib/supabase/server';

// Chainable Supabase-Mock (jede Methode gibt sich selbst zurueck)
function chainable(result: { data: unknown; error: unknown }) {
  const obj: Record<string, unknown> = {};
  const methods = ['select', 'eq', 'in', 'gte', 'lte', 'order', 'limit', 'not', 'delete', 'update', 'insert'];
  for (const m of methods) {
    obj[m] = vi.fn().mockReturnValue(obj);
  }
  obj.single = vi.fn().mockResolvedValue(result);
  obj.then = (resolve: (v: unknown) => void, reject?: (e: unknown) => void) => {
    return Promise.resolve(result).then(resolve, reject);
  };
  return obj;
}

// Supabase-Mock mit konfigurierbaren Tabellen-Antworten
function buildMockSupabase(overrides: Record<string, { data: unknown; error: unknown }> = {}) {
  const defaultResult = { data: null, error: null };

  const tableResponses: Record<string, { data: unknown; error: unknown }> = {
    household_members: {
      data: {
        household_id: 'hh-1',
        household: { quarter_id: 'q-1' },
      },
      error: null,
    },
    quarter_collection_areas: { data: [{ area_id: 'area-1' }], error: null },
    waste_collection_dates: {
      data: [
        { collection_date: '2026-03-24', waste_type: 'restmuell' },
        { collection_date: '2026-03-26', waste_type: 'biomuell' },
      ],
      error: null,
    },
    events: {
      data: [
        { title: 'Quartiersfest', event_date: '2026-04-01', event_time: '18:00', location: 'Innenhof' },
      ],
      error: null,
    },
    ...overrides,
  };

  return {
    from: vi.fn((table: string) => {
      const result = tableResponses[table] ?? defaultResult;
      return chainable(result);
    }),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('isWriteTool', () => {
  it('gibt true fuer Write-Tools zurueck', () => {
    expect(isWriteTool('create_bulletin_post')).toBe(true);
    expect(isWriteTool('create_help_request')).toBe(true);
    expect(isWriteTool('create_event')).toBe(true);
    expect(isWriteTool('report_issue')).toBe(true);
    expect(isWriteTool('create_marketplace_listing')).toBe(true);
    expect(isWriteTool('update_help_offers')).toBe(true);
    expect(isWriteTool('send_message')).toBe(true);
    expect(isWriteTool('update_profile')).toBe(true);
  });

  it('gibt false fuer Read-Tools zurueck', () => {
    expect(isWriteTool('get_waste_dates')).toBe(false);
    expect(isWriteTool('get_upcoming_events')).toBe(false);
    expect(isWriteTool('navigate_to')).toBe(false);
  });

  it('gibt false fuer unbekannte Tool-Namen zurueck', () => {
    expect(isWriteTool('unknown_tool')).toBe(false);
    expect(isWriteTool('')).toBe(false);
  });
});

describe('executeCompanionTool', () => {
  describe('navigate_to', () => {
    it('gibt success + route zurueck', async () => {
      const mock = buildMockSupabase();
      vi.mocked(createClient).mockResolvedValue(mock as unknown as Awaited<ReturnType<typeof createClient>>);

      const result = await executeCompanionTool('navigate_to', { route: '/dashboard' }, 'user-1');
      expect(result.success).toBe(true);
      expect(result.route).toBe('/dashboard');
    });
  });

  describe('get_waste_dates', () => {
    it('gibt formatierte Muelltermine zurueck', async () => {
      const mock = buildMockSupabase();
      vi.mocked(createClient).mockResolvedValue(mock as unknown as Awaited<ReturnType<typeof createClient>>);

      const result = await executeCompanionTool('get_waste_dates', {}, 'user-1');
      expect(result.success).toBe(true);
      expect(result.summary).toContain('Muelltermine');
      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
    });

    it('gibt leere Liste zurueck wenn keine Gebiete vorhanden', async () => {
      const mock = buildMockSupabase({
        quarter_collection_areas: { data: [], error: null },
      });
      vi.mocked(createClient).mockResolvedValue(mock as unknown as Awaited<ReturnType<typeof createClient>>);

      const result = await executeCompanionTool('get_waste_dates', {}, 'user-1');
      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });
  });

  describe('get_upcoming_events', () => {
    it('gibt formatierte Events zurueck', async () => {
      const mock = buildMockSupabase();
      vi.mocked(createClient).mockResolvedValue(mock as unknown as Awaited<ReturnType<typeof createClient>>);

      const result = await executeCompanionTool('get_upcoming_events', {}, 'user-1');
      expect(result.success).toBe(true);
      expect(result.summary).toContain('Veranstaltungen');
      expect(result.data).toBeDefined();
    });
  });

  describe('send_message', () => {
    it('gibt Fehler zurueck (noch nicht implementiert)', async () => {
      const mock = buildMockSupabase();
      vi.mocked(createClient).mockResolvedValue(mock as unknown as Awaited<ReturnType<typeof createClient>>);

      const result = await executeCompanionTool(
        'send_message',
        { recipient_name: 'Max', text: 'Hallo' },
        'user-1'
      );
      expect(result.success).toBe(false);
      expect(result.summary).toContain('nicht');
    });
  });

  describe('unbekanntes Tool', () => {
    it('gibt Fehler zurueck', async () => {
      const mock = buildMockSupabase();
      vi.mocked(createClient).mockResolvedValue(mock as unknown as Awaited<ReturnType<typeof createClient>>);

      const result = await executeCompanionTool('nonexistent_tool', {}, 'user-1');
      expect(result.success).toBe(false);
      expect(result.summary).toContain('Unbekanntes Tool');
    });
  });

  describe('fehlende Quartier-Zuordnung', () => {
    it('gibt Fehler zurueck wenn Nutzer kein Quartier hat', async () => {
      const mock = buildMockSupabase({
        household_members: { data: null, error: null },
      });
      vi.mocked(createClient).mockResolvedValue(mock as unknown as Awaited<ReturnType<typeof createClient>>);

      const result = await executeCompanionTool(
        'create_bulletin_post',
        { title: 'Test', text: 'Inhalt' },
        'user-no-quarter'
      );
      expect(result.success).toBe(false);
      expect(result.summary).toContain('Quartier');
    });
  });
});
