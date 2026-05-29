// __tests__/api/user-export.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mocks
const mockGetUser = vi.fn();

// Chainable Mock-Builder fuer Supabase Queries (inkl. .or() + count + insert)
function createChainMock() {
  const result = { data: [], error: null, count: 0 };
  const chain: Record<string, unknown> = {};
  chain.select = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.or = vi.fn().mockReturnValue(chain);
  chain.in = vi.fn().mockReturnValue(chain);
  chain.order = vi.fn().mockReturnValue(chain);
  chain.limit = vi.fn().mockReturnValue(chain);
  chain.single = vi.fn().mockResolvedValue({ data: null, error: null });
  chain.insert = vi.fn().mockResolvedValue({ error: null });
  // Thenable: await an jeder Stelle der Kette gibt das Ergebnis
  chain.then = (resolve: (value: typeof result) => void) => resolve(result);
  return chain;
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: vi.fn(() => createChainMock()),
  })),
}));

// Export läuft jetzt über den Service-Role-Client (Vollständigkeit, kein RLS-Blindspot)
vi.mock('@/lib/supabase/admin', () => ({
  getAdminSupabase: vi.fn(() => ({
    from: vi.fn(() => createChainMock()),
  })),
}));

describe('GET /api/user/export', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('gibt 401 ohne Authentifizierung zurueck', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const { GET } = await import('@/app/api/user/export/route');
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('gibt JSON-Export fuer authentifizierten Nutzer zurueck', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1', email: 'test@test.de' } } });

    const { GET } = await import('@/app/api/user/export/route');
    const res = await GET();
    expect(res.status).toBe(200);

    // Content-Disposition Header pruefen (JSON-Download)
    const contentDisposition = res.headers.get('content-disposition');
    expect(contentDisposition).toContain('attachment');
    expect(contentDisposition).toContain('.json');
  });
});
