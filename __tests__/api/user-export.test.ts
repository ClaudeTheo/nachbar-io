// __tests__/api/user-export.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mocks
const mockGetUser = vi.fn();

// Chainable Mock-Builder fuer Supabase Queries
function createChainMock() {
  const result = { data: [], error: null };
  const singleResult = { data: null, error: null };
  const chain: Record<string, unknown> = {};
  chain.select = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.in = vi.fn().mockReturnValue(chain);
  chain.order = vi.fn().mockReturnValue(chain);
  chain.limit = vi.fn().mockReturnValue(chain);
  chain.single = vi.fn().mockResolvedValue(singleResult);
  // Ohne single() am Ende: Promise.all() erwartet thenables
  chain.then = (resolve: (value: { data: never[]; error: null }) => void) => resolve(result);
  return chain;
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
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
