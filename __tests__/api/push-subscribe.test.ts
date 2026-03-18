// __tests__/api/push-subscribe.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mocks
const mockGetUser = vi.fn();
const mockInsert = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: vi.fn(() => ({
      insert: mockInsert,
      delete: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ error: null }),
        })),
      })),
    })),
  })),
}));

describe('POST /api/push/subscribe', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('gibt 401 ohne Authentifizierung zurueck', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const { POST } = await import('@/app/api/push/subscribe/route');
    const req = new Request('http://localhost/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const res = await POST(req as any);
    expect(res.status).toBe(401);
  });

  it('gibt 400 bei fehlenden Keys zurueck', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });

    const { POST } = await import('@/app/api/push/subscribe/route');
    const req = new Request('http://localhost/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint: 'https://push.example.com' }),
    });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
  });

  it('gibt 400 bei HTTP-Endpoint zurueck (nur HTTPS erlaubt)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });

    const { POST } = await import('@/app/api/push/subscribe/route');
    const req = new Request('http://localhost/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        endpoint: 'http://insecure.example.com',
        keys: { p256dh: 'abc', auth: 'def' },
      }),
    });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('HTTPS');
  });

  it('speichert gueltige Subscription', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    mockInsert.mockResolvedValue({ error: null });

    const { POST } = await import('@/app/api/push/subscribe/route');
    const req = new Request('http://localhost/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        endpoint: 'https://push.example.com/v1/sub123',
        keys: { p256dh: 'p256dh-key', auth: 'auth-key' },
      }),
    });
    const res = await POST(req as any);
    expect(res.status).toBe(200);
    expect(mockInsert).toHaveBeenCalledWith({
      user_id: 'u1',
      endpoint: 'https://push.example.com/v1/sub123',
      p256dh: 'p256dh-key',
      auth: 'auth-key',
    });
  });
});

describe('DELETE /api/push/subscribe', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('gibt 401 ohne Authentifizierung zurueck', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const { DELETE } = await import('@/app/api/push/subscribe/route');
    const req = new Request('http://localhost/api/push/subscribe', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint: 'https://push.example.com/v1/sub123' }),
    });
    const res = await DELETE(req as any);
    expect(res.status).toBe(401);
  });
});
