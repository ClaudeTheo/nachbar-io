// __tests__/api/heartbeat.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mocks
const mockInsert = vi.fn();
const mockGetUser = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
    from: vi.fn(() => ({ insert: mockInsert })),
  })),
}));

describe('POST /api/heartbeat', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('erstellt Heartbeat fuer authentifizierten Nutzer', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    mockInsert.mockResolvedValue({ error: null });

    const { POST } = await import('@/app/api/heartbeat/route');
    const request = new Request('http://localhost/api/heartbeat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source: 'app', device_type: 'mobile' }),
    });

    const response = await POST(request as unknown as import('next/server').NextRequest);
    expect(response.status).toBe(201);
    expect(mockInsert).toHaveBeenCalledWith({
      user_id: 'user-1',
      source: 'app',
      device_type: 'mobile',
    });
  });

  it('gibt 401 ohne Auth zurueck', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const { POST } = await import('@/app/api/heartbeat/route');
    const request = new Request('http://localhost/api/heartbeat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source: 'app' }),
    });

    const response = await POST(request as unknown as import('next/server').NextRequest);
    expect(response.status).toBe(401);
  });

  it('validiert source-Feld', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });

    const { POST } = await import('@/app/api/heartbeat/route');
    const request = new Request('http://localhost/api/heartbeat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source: 'invalid' }),
    });

    const response = await POST(request as unknown as import('next/server').NextRequest);
    expect(response.status).toBe(400);
  });
});
