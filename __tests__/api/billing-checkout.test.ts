// __tests__/api/billing-checkout.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mocks
const mockGetUser = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
  })),
}));

// Admin Supabase Mock (fuer Early-Adopter-Check)
const mockCountResult = vi.fn();
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        not: vi.fn(() => ({
          not: vi.fn().mockResolvedValue({ count: 5 }),
        })),
      })),
      upsert: vi.fn().mockResolvedValue({ error: null }),
      update: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ error: null }),
      })),
    })),
  })),
}));

vi.mock('@/lib/stripe', () => ({
  stripe: {
    checkout: {
      sessions: {
        create: vi.fn().mockResolvedValue({ url: 'https://checkout.stripe.com/test' }),
      },
    },
  },
  getStripePriceId: vi.fn().mockReturnValue('price_test123'),
}));

vi.mock('@/lib/care/audit', () => ({
  writeAuditLog: vi.fn().mockResolvedValue(undefined),
}));

describe('POST /api/billing/checkout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
  });

  it('gibt 401 ohne Authentifizierung zurueck', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const { POST } = await import('@/app/api/billing/checkout/route');
    const req = new Request('http://localhost/api/billing/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planType: 'plus' }),
    });
    const res = await POST(req as any);
    expect(res.status).toBe(401);
  });

  it('gibt 400 bei ungueltigem Plan zurueck', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1', email: 'test@test.de' } } });

    const { POST } = await import('@/app/api/billing/checkout/route');
    const req = new Request('http://localhost/api/billing/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planType: 'premium_gold' }),
    });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('Plan');
  });

  it('gibt 400 bei pro_community ohne quarterId zurueck', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1', email: 'test@test.de' } } });

    const { POST } = await import('@/app/api/billing/checkout/route');
    const req = new Request('http://localhost/api/billing/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planType: 'pro_community' }),
    });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('quarterId');
  });

  it('gibt 400 bei ungueltigem Body zurueck', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1', email: 'test@test.de' } } });

    const { POST } = await import('@/app/api/billing/checkout/route');
    const req = new Request('http://localhost/api/billing/checkout', {
      method: 'POST',
    });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
  });
});
