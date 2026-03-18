// __tests__/api/pilot-households.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mocks
const mockSelect = vi.fn();

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: mockSelect,
    })),
  })),
}));

describe('GET /api/pilot/households', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    // Env-Variablen setzen
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
  });

  it('gibt 401 ohne Token zurueck', async () => {
    const { GET } = await import('@/app/api/pilot/households/route');
    const req = new Request('http://localhost/api/pilot/households');
    const res = await GET(req as unknown as import('next/server').NextRequest);
    expect(res.status).toBe(401);
  });

  it('gibt 401 bei falschem Token zurueck', async () => {
    const { GET } = await import('@/app/api/pilot/households/route');
    const req = new Request('http://localhost/api/pilot/households?token=wrong');
    const res = await GET(req as unknown as import('next/server').NextRequest);
    expect(res.status).toBe(401);
  });

  it('gibt Haushalte mit gueltigem Token zurueck', async () => {
    const mockData = [
      { id: '1', street_name: 'Sanarystraße', house_number: '2', invite_code: 'PILOT-ABCD-EFGH' },
    ];

    // Supabase Query Chain mocken
    const orderFn2 = vi.fn().mockResolvedValue({ data: mockData, error: null });
    const orderFn1 = vi.fn().mockReturnValue({ order: orderFn2 });
    const eqFn = vi.fn().mockReturnValue({ order: orderFn1 });
    mockSelect.mockReturnValue({ eq: eqFn });

    const { GET } = await import('@/app/api/pilot/households/route');
    const req = new Request('http://localhost/api/pilot/households?token=pilot-2026');
    const res = await GET(req as unknown as import('next/server').NextRequest);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.households).toHaveLength(1);
    expect(body.households[0].invite_code).toBe('PILOT-ABCD-EFGH');
  });

  it('gibt 500 bei Datenbankfehler zurueck', async () => {
    const orderFn2 = vi.fn().mockResolvedValue({ data: null, error: { message: 'DB Fehler' } });
    const orderFn1 = vi.fn().mockReturnValue({ order: orderFn2 });
    const eqFn = vi.fn().mockReturnValue({ order: orderFn1 });
    mockSelect.mockReturnValue({ eq: eqFn });

    const { GET } = await import('@/app/api/pilot/households/route');
    const req = new Request('http://localhost/api/pilot/households?token=pilot-2026');
    const res = await GET(req as unknown as import('next/server').NextRequest);

    expect(res.status).toBe(500);
  });
});
