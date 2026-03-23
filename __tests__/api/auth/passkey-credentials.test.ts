import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/auth/passkey/credentials/route';

// Supabase Mock
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockOrder = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      }),
    },
    from: vi.fn(() => ({
      select: (...args: unknown[]) => {
        mockSelect(...args);
        return {
          eq: (...eqArgs: unknown[]) => {
            mockEq(...eqArgs);
            return {
              order: (...orderArgs: unknown[]) => {
                mockOrder(...orderArgs);
                return {
                  data: [
                    { id: 'cred-1', device_name: 'iPhone', created_at: '2026-01-01', last_used_at: null },
                  ],
                  error: null,
                };
              },
            };
          },
        };
      },
    })),
  }),
}));

describe('GET /api/auth/passkey/credentials', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('gibt ein Array zurueck, KEIN Objekt mit credentials-Key', async () => {
    const response = await GET();
    const body = await response.json();

    // KRITISCH: Response muss ein Array sein, kein { credentials: [...] }
    // Sonst crashed die Passkey-Seite mit "credentials.map is not a function"
    expect(Array.isArray(body)).toBe(true);
    expect(body).toHaveLength(1);
    expect(body[0].device_name).toBe('iPhone');
  });

  it('gibt leeres Array zurueck wenn keine Credentials vorhanden', async () => {
    // Override fuer diesen Test: leere Liste
    mockOrder.mockReturnValueOnce({ data: [], error: null });

    const response = await GET();
    const body = await response.json();

    expect(Array.isArray(body)).toBe(true);
  });
});
