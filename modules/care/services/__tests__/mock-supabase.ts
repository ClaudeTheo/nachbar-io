// lib/care/__tests__/mock-supabase.ts
// Nachbar.io — Wiederverwendbarer Supabase-Mock fuer Care-Modul Tests
// Unterstuetzt table-aware Responses fuer API-Route-Tests

import { vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';

interface MockResponse {
  data: unknown;
  error: unknown;
}

/**
 * Erstellt einen table-aware Supabase-Client-Mock.
 * Jede .from(table)-Chain resolved mit der naechsten Response aus der Queue der Tabelle.
 *
 * Verwendung:
 *   const mock = createRouteMockSupabase();
 *   mock.setUser({ id: 'user-1', email: 'test@test.de' });
 *   mock.addResponse('care_sos_alerts', { data: { id: 'alert-1' }, error: null });
 *   mock.addResponse('care_helpers', { data: [{ user_id: 'h-1' }], error: null });
 */
export function createRouteMockSupabase() {
  const tableResponses = new Map<string, MockResponse[]>();
  const fromCalls: Array<{ table: string; args: unknown[][] }> = [];

  function addResponse(table: string, response: MockResponse) {
    if (!tableResponses.has(table)) tableResponses.set(table, []);
    tableResponses.get(table)!.push(response);
  }

  function consumeResponse(table: string): MockResponse {
    const queue = tableResponses.get(table);
    if (queue && queue.length > 0) return queue.shift()!;
    return { data: null, error: null };
  }

  const authGetUser = vi.fn().mockResolvedValue({ data: { user: null }, error: null });

  const fromFn = vi.fn().mockImplementation((table: string) => {
    const callLog: unknown[][] = [];
    fromCalls.push({ table, args: callLog });

    const createChain = (): unknown => {
      return new Proxy({}, {
        get(_target, prop: string) {
          if (prop === 'then') {
            const response = consumeResponse(table);
            return (resolve: (v: unknown) => void, reject?: (e: unknown) => void) => {
              return Promise.resolve(response).then(resolve, reject);
            };
          }
          // Jede Chain-Methode protokolliert den Aufruf und gibt eine neue Chain zurueck
          return (...args: unknown[]) => {
            callLog.push([prop, ...args]);
            return createChain();
          };
        },
      });
    };

    return createChain();
  });

  const supabase = {
    from: fromFn,
    auth: { getUser: authGetUser },
  } as unknown as SupabaseClient;

  function resetFromImpl() {
    fromFn.mockImplementation((table: string) => {
      const callLog: unknown[][] = [];
      fromCalls.push({ table, args: callLog });

      const createChain = (): unknown => {
        return new Proxy({}, {
          get(_target, prop: string) {
            if (prop === 'then') {
              const response = consumeResponse(table);
              return (resolve: (v: unknown) => void, reject?: (e: unknown) => void) => {
                return Promise.resolve(response).then(resolve, reject);
              };
            }
            return (...args: unknown[]) => {
              callLog.push([prop, ...args]);
              return createChain();
            };
          },
        });
      };

      return createChain();
    });
  }

  return {
    supabase,
    /** Response fuer eine Tabelle in die Queue einfuegen (FIFO) */
    addResponse,
    /** Authentifizierten User setzen */
    setUser(user: { id: string; email?: string; [key: string]: unknown } | null) {
      authGetUser.mockResolvedValue({
        data: { user },
        error: null,
      });
    },
    /** Alle from()-Aufrufe (Tabelle + verkettete Methoden-Args) */
    fromCalls,
    /** Direkt-Zugriff auf from-Mock */
    fromFn,
    /** Direkt-Zugriff auf auth.getUser-Mock */
    authGetUser,
    /** Zustand komplett zuruecksetzen (fuer beforeEach) */
    reset() {
      tableResponses.clear();
      fromCalls.length = 0;
      authGetUser.mockResolvedValue({ data: { user: null }, error: null });
      resetFromImpl();
    },
  };
}
