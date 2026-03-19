// __tests__/api/care/medications.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

// Mocks
const mockRequireAuth = vi.fn();
const mockRequireSubscription = vi.fn();
const _mockSelect = vi.fn();
const _mockInsert = vi.fn();

vi.mock('@/lib/care/api-helpers', () => ({
  requireAuth: (...args: unknown[]) => mockRequireAuth(...args),
  requireSubscription: (...args: unknown[]) => mockRequireSubscription(...args),
  unauthorizedResponse: () => NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 }),
  requireCareAccess: vi.fn().mockResolvedValue('caregiver'),
}));

vi.mock('@/lib/care/audit', () => ({
  writeAuditLog: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/care/field-encryption', () => ({
  encryptFields: vi.fn((data: unknown) => data),
  decryptFieldsArray: vi.fn((data: unknown) => data),
  CARE_MEDICATIONS_ENCRYPTED_FIELDS: ['name', 'dosage', 'schedule', 'instructions'],
}));

describe('GET /api/care/medications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('gibt 401 ohne Authentifizierung zurueck', async () => {
    mockRequireAuth.mockResolvedValue(null);

    const { GET } = await import('@/app/api/care/medications/route');
    const req = new NextRequest('http://localhost/api/care/medications');
    const res = await GET(req as unknown as NextRequest);
    expect(res.status).toBe(401);
  });

  it('gibt 403 bei fehlendem Plus-Abo zurueck', async () => {
    const mockSupabase = { from: vi.fn() };
    mockRequireAuth.mockResolvedValue({ supabase: mockSupabase, user: { id: 'u1' } });
    mockRequireSubscription.mockResolvedValue(
      NextResponse.json({ error: 'Plus-Abo erforderlich' }, { status: 403 })
    );

    const { GET } = await import('@/app/api/care/medications/route');
    const req = new NextRequest('http://localhost/api/care/medications');
    const res = await GET(req as unknown as NextRequest);
    expect(res.status).toBe(403);
  });

  it('gibt Medikamente fuer authentifizierten Nutzer zurueck', async () => {
    const mockMeds = [
      { id: 'm1', name: 'Aspirin', dosage: '100mg', active: true },
    ];
    // Universeller chainable Mock
    const chain: Record<string, unknown> = {};
    chain.select = vi.fn().mockReturnValue(chain);
    chain.eq = vi.fn().mockReturnValue(chain);
    chain.order = vi.fn().mockReturnValue(chain);
    chain.limit = vi.fn().mockReturnValue(chain);
    chain.then = (resolve: (value: { data: typeof mockMeds; error: null }) => void) => resolve({ data: mockMeds, error: null });

    const mockSupabase = { from: vi.fn().mockReturnValue(chain) };
    mockRequireAuth.mockResolvedValue({ supabase: mockSupabase, user: { id: 'u1' } });
    mockRequireSubscription.mockResolvedValue(true);

    const { GET } = await import('@/app/api/care/medications/route');
    const req = new NextRequest('http://localhost/api/care/medications');
    const res = await GET(req as unknown as NextRequest);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(1);
  });
});

describe('POST /api/care/medications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('gibt 401 ohne Authentifizierung zurueck', async () => {
    mockRequireAuth.mockResolvedValue(null);

    const { POST } = await import('@/app/api/care/medications/route');
    const req = new NextRequest('http://localhost/api/care/medications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Aspirin', dosage: '100mg' }),
    });
    const res = await POST(req as unknown as NextRequest);
    expect(res.status).toBe(401);
  });
});
