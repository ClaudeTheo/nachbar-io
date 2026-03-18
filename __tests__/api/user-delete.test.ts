// __tests__/api/user-delete.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mocks
const mockGetUser = vi.fn();
const mockFrom = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}));

// Admin-Client Mock
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      delete: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ error: null }),
      })),
    })),
    auth: {
      admin: {
        deleteUser: vi.fn().mockResolvedValue({ error: null }),
      },
    },
  })),
}));

describe('POST /api/user/delete', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
  });

  it('gibt 401 ohne Authentifizierung zurueck', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const { POST } = await import('@/app/api/user/delete/route');
    const req = new Request('http://localhost/api/user/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirmText: 'KONTO LÖSCHEN' }),
    });
    const res = await POST(req as any);
    expect(res.status).toBe(401);
  });

  it('gibt 400 ohne korrekten Bestaetigungstext zurueck', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });

    const { POST } = await import('@/app/api/user/delete/route');
    const req = new Request('http://localhost/api/user/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirmText: 'bitte löschen' }),
    });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
  });

  it('gibt 400 bei fehlendem Body zurueck', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });

    const { POST } = await import('@/app/api/user/delete/route');
    const req = new Request('http://localhost/api/user/delete', {
      method: 'POST',
    });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
  });

  it('gibt 500 bei fehlender Server-Konfiguration zurueck', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;

    const { POST } = await import('@/app/api/user/delete/route');
    const req = new Request('http://localhost/api/user/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirmText: 'KONTO LÖSCHEN' }),
    });
    const res = await POST(req as any);
    expect(res.status).toBe(500);
  });
});
