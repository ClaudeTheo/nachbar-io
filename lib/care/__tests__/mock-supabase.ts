// lib/care/__tests__/mock-supabase.ts
// Nachbar.io — Wiederverwendbarer Supabase-Mock fuer Care-Modul Tests

import { vi } from 'vitest';

/**
 * Erstellt einen Supabase-Client-Mock mit verkettbaren Query-Methoden.
 * Verwendung:
 *   const { supabase, mockQuery } = createMockSupabase();
 *   mockQuery.mockResolvedValueOnce({ data: [...], error: null });
 */
export function createMockSupabase() {
  // Terminal-Methoden die ein Promise zurueckgeben
  const mockQuery = vi.fn().mockResolvedValue({ data: null, error: null });

  // Chainable Query-Builder
  const queryBuilder: Record<string, ReturnType<typeof vi.fn>> = {};
  const chainMethods = [
    'select', 'insert', 'update', 'upsert', 'delete',
    'eq', 'neq', 'in', 'lt', 'gt', 'lte', 'gte',
    'contains', 'is', 'not', 'or', 'filter',
    'order', 'limit', 'range', 'offset',
    'single', 'maybeSingle',
  ];

  // Jede Methode gibt den Builder zurueck (chaining)
  for (const method of chainMethods) {
    queryBuilder[method] = vi.fn();
  }

  // Proxy der alle Aufrufe chainbar macht und am Ende mockQuery aufruft
  const createChain = (): unknown => {
    return new Proxy({}, {
      get(_target, prop: string) {
        if (prop === 'then') {
          // Promise-Interface: resolve mit mockQuery-Ergebnis
          return (resolve: (v: unknown) => void) => {
            return mockQuery().then(resolve);
          };
        }
        // Aufgerufen wird die queryBuilder-Funktion, gibt wieder eine Chain zurueck
        if (queryBuilder[prop]) {
          queryBuilder[prop].mockReturnValue(undefined);
          return (...args: unknown[]) => {
            queryBuilder[prop](...args);
            return createChain();
          };
        }
        // Fallback: weitere Chain zurueckgeben
        return (..._args: unknown[]) => createChain();
      },
    });
  };

  const supabase = {
    from: vi.fn().mockImplementation(() => createChain()),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
    },
  };

  return {
    supabase: supabase as unknown as import('@supabase/supabase-js').SupabaseClient,
    mockQuery,
    queryBuilder,
  };
}
