// __tests__/components/hilfe/BudgetTracker.test.tsx
// Nachbar Hilfe — Tests fuer BudgetTracker Komponente

import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import { BudgetTracker } from '@/components/hilfe/BudgetTracker';
import type { BudgetSummary } from '@/lib/hilfe/types';

afterEach(() => {
  cleanup();
});

const mockBudget: BudgetSummary = {
  monthly_budget_cents: 13100,
  used_this_month_cents: 6500,
  available_cents: 6600,
  carry_over_cents: 0,
  sessions_this_month: 3,
};

beforeEach(() => {
  vi.restoreAllMocks();
});

function mockFetchSuccess(data: BudgetSummary) {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(data),
  });
}

describe('BudgetTracker', () => {
  it('zeigt Fortschrittsbalken an', async () => {
    mockFetchSuccess(mockBudget);
    render(<BudgetTracker />);

    await waitFor(() => {
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });
  });

  it('zeigt "131" als Budgetbetrag an', async () => {
    mockFetchSuccess(mockBudget);
    render(<BudgetTracker />);

    await waitFor(() => {
      expect(screen.getByText(/131,00 EUR/)).toBeInTheDocument();
    });
  });

  it('zeigt Uebertragshinweis mit "30.06." an', async () => {
    mockFetchSuccess(mockBudget);
    render(<BudgetTracker />);

    await waitFor(() => {
      expect(screen.getByText(/30\.06\./)).toBeInTheDocument();
    });
  });
});
