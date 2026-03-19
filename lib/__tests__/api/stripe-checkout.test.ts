// lib/__tests__/api/stripe-checkout.test.ts
// Tests fuer Stripe Checkout Route — Authentifizierung, Validierung, Plan-Typen
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// --- Mocks ---

// Supabase Auth Mock
const mockGetUser = vi.fn();
const _mockSupabaseFrom = vi.fn(() => ({
  select: vi.fn(() => ({
    eq: vi.fn(() => ({
      maybeSingle: vi.fn(() => ({ data: null })),
    })),
    count: vi.fn(() => ({ count: 250 })), // > EARLY_ADOPTER_LIMIT, damit Stripe-Pfad greift
  })),
  insert: vi.fn(() => ({
    select: vi.fn(() => ({
      single: vi.fn(() => ({ data: { id: 'sub-1' }, error: null })),
    })),
  })),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve({
    auth: {
      getUser: mockGetUser,
    },
  })),
}));

// Supabase Admin-Client Mock (Service Role)
const mockAdminFrom = vi.fn();
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: mockAdminFrom,
  })),
}));

// Stripe Mock
const mockCheckoutCreate = vi.fn();
vi.mock('@/lib/stripe', () => ({
  stripe: {
    checkout: {
      sessions: {
        create: (...args: unknown[]) => mockCheckoutCreate(...args),
      },
    },
  },
  getStripePriceId: vi.fn((plan: string, interval: string) => {
    if (['plus', 'pro_community', 'pro_medical'].includes(plan)) {
      return `price_${plan}_${interval}`;
    }
    return undefined;
  }),
}));

// Audit-Log Mock
vi.mock('@/lib/care/audit', () => ({
  writeAuditLog: vi.fn(),
}));

// --- Hilfsfunktionen ---

function createMockRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost:3000/api/billing/checkout', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

// Admin-DB Mock konfigurieren (> 200 Abos = kein Early Adopter)
function setupAdminDbMock(paidSubsCount = 250) {
  mockAdminFrom.mockImplementation((table: string) => {
    if (table === 'care_subscriptions') {
      return {
        select: vi.fn(() => ({
          count: undefined,
          in: vi.fn(() => ({
            in: vi.fn(() => ({ count: paidSubsCount })),
          })),
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(() => ({ data: null })),
          })),
        })),
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => ({ data: { id: 'sub-new' }, error: null })),
          })),
        })),
      };
    }
    if (table === 'users') {
      return {
        update: vi.fn(() => ({
          eq: vi.fn(() => ({ error: null })),
        })),
      };
    }
    if (table === 'org_members') {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(() => ({ data: null })),
          })),
        })),
        insert: vi.fn(() => ({ error: null })),
      };
    }
    if (table === 'doctor_profiles') {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(() => ({ data: null })),
          })),
        })),
        insert: vi.fn(() => ({ error: null })),
      };
    }
    return { select: vi.fn(), insert: vi.fn(), update: vi.fn() };
  });
}

// --- Tests ---

describe('POST /api/billing/checkout', () => {
  let POST: (request: NextRequest) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    setupAdminDbMock();
    mockCheckoutCreate.mockResolvedValue({
      url: 'https://checkout.stripe.com/session-123',
    });

    // Route dynamisch importieren (nach Mock-Setup)
    const mod = await import('@/app/api/billing/checkout/route');
    POST = mod.POST;
  });

  it('gibt 401 zurueck ohne Authentifizierung', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const req = createMockRequest({ planType: 'plus' });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error).toBe('Nicht authentifiziert');
  });

  it('gibt 400 zurueck fuer ungueltigen planType', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1', email: 'test@test.de' } },
    });

    const req = createMockRequest({ planType: 'invalid_plan' });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe('Ungueltiger Plan');
  });

  it('lehnt "free" als planType ab', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1', email: 'test@test.de' } },
    });

    const req = createMockRequest({ planType: 'free' });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe('Ungueltiger Plan');
  });

  it('pro_community erfordert quarterId', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1', email: 'test@test.de' } },
    });

    const req = createMockRequest({ planType: 'pro_community', interval: 'monthly' });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain('Quartier-ID');
  });

  it('akzeptiert pro_community mit quarterId', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1', email: 'test@test.de' } },
    });

    const req = createMockRequest({
      planType: 'pro_community',
      interval: 'monthly',
      quarterId: 'quarter-bad-saeckingen',
    });
    const res = await POST(req);
    const json = await res.json();

    // Entweder Stripe-Checkout-URL oder Early-Adopter-Antwort
    expect(res.status).toBe(200);
    expect(json.url || json.earlyAdopter).toBeTruthy();
  });

  it('akzeptiert plus ohne quarterId', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1', email: 'test@test.de' } },
    });

    const req = createMockRequest({ planType: 'plus', interval: 'yearly' });
    const res = await POST(req);

    // Sollte nicht 400 sein (kein Validierungsfehler)
    expect(res.status).not.toBe(400);
  });

  it('akzeptiert pro_medical ohne quarterId', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1', email: 'test@test.de' } },
    });

    const req = createMockRequest({ planType: 'pro_medical', interval: 'monthly' });
    const res = await POST(req);

    expect(res.status).not.toBe(400);
  });

  it('akzeptiert abwaertskompatiblen "plan" Parameter', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1', email: 'test@test.de' } },
    });

    // Alter Parameter-Name "plan" statt "planType"
    const req = createMockRequest({ plan: 'plus', billing_cycle: 'monthly' });
    const res = await POST(req);

    expect(res.status).not.toBe(400);
  });
});
