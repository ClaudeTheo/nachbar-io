// __tests__/api/youth-register.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Supabase Mock
const mockSingle = vi.fn();
const mockSelect = vi.fn(() => ({ single: mockSingle }));
const mockEq = vi.fn(() => ({ single: mockSingle }));
const mockInsert = vi.fn(() => ({ select: mockSelect }));
const mockFrom = vi.fn(() => ({
  insert: mockInsert,
  select: vi.fn(() => ({ eq: mockEq })),
}));

const mockSupabase = {
  auth: { getUser: vi.fn() },
  from: mockFrom,
};

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => mockSupabase),
}));

import { POST } from '@/app/api/youth/register/route';
import { NextRequest } from 'next/server';

function createRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/youth/register', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

describe('POST /api/youth/register', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-1', phone: '+491701234567' } },
    });
  });

  it('lehnt ab wenn kein authentifizierter User', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });
    const res = await POST(createRequest({ birth_year: 2010 }));
    expect(res.status).toBe(401);
  });

  it('lehnt ab wenn birth_year fehlt', async () => {
    const res = await POST(createRequest({}));
    expect(res.status).toBe(400);
  });

  it('lehnt ab wenn Alter ausserhalb 14-17', async () => {
    const res = await POST(createRequest({ birth_year: 2020 }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('14');
  });
});
