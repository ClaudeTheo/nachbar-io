// __tests__/api/hilfe/budget.test.ts
// Nachbar Hilfe — Tests fuer Entlastungsbetrag-Tracker API

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { createRouteMockSupabase } from '@/lib/care/__tests__/mock-supabase';

const mockSupabase = createRouteMockSupabase();

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockImplementation(() => Promise.resolve(mockSupabase.supabase)),
}));

describe('/api/hilfe/budget', () => {
  beforeEach(() => {
    mockSupabase.reset();
    vi.clearAllMocks();
  });

  it('gibt 401 zurueck ohne Authentifizierung', async () => {
    const { GET } = await import('@/app/api/hilfe/budget/route');
    const response = await GET();
    expect(response.status).toBe(401);
  });

  it('gibt BudgetSummary mit korrekter Struktur zurueck', async () => {
    mockSupabase.setUser({ id: 'user-1', email: 'bewohner@test.de' });
    mockSupabase.addResponse('help_sessions', {
      data: [],
      error: null,
    });

    const { GET } = await import('@/app/api/hilfe/budget/route');
    const response = await GET();
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body).toHaveProperty('monthly_budget_cents');
    expect(body).toHaveProperty('used_this_month_cents');
    expect(body).toHaveProperty('available_cents');
    expect(body).toHaveProperty('carry_over_cents');
    expect(body).toHaveProperty('sessions_this_month');
    expect(body.monthly_budget_cents).toBe(13100);
  });

  it('berechnet verbrauchtes und verfuegbares Budget korrekt', async () => {
    mockSupabase.setUser({ id: 'user-2', email: 'pflege@test.de' });
    mockSupabase.addResponse('help_sessions', {
      data: [
        { total_amount_cents: 3000 },
        { total_amount_cents: 4500 },
      ],
      error: null,
    });

    const { GET } = await import('@/app/api/hilfe/budget/route');
    const response = await GET();
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.used_this_month_cents).toBe(7500);
    expect(body.available_cents).toBe(13100 - 7500);
  });

  it('zaehlt Sessions diesen Monat korrekt', async () => {
    mockSupabase.setUser({ id: 'user-3', email: 'senior@test.de' });
    mockSupabase.addResponse('help_sessions', {
      data: [
        { total_amount_cents: 2000 },
        { total_amount_cents: 1500 },
        { total_amount_cents: 3200 },
      ],
      error: null,
    });

    const { GET } = await import('@/app/api/hilfe/budget/route');
    const response = await GET();
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.sessions_this_month).toBe(3);
  });
});
