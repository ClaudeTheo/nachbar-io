import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { HelpRequestCard } from '@/modules/hilfe/components/HelpRequestCard';
import type { HelpRequest } from '@/modules/hilfe/services/types';

afterEach(() => {
  cleanup();
});

const baseRequest: HelpRequest = {
  id: 'req-1',
  user_id: 'user-1',
  quarter_id: 'q-1',
  category: 'einkaufen',
  description: 'Brauche Hilfe beim Wocheneinkauf im Rewe.',
  preferred_time: 'Dienstag Vormittag',
  status: 'open',
  created_at: '2026-03-27T10:00:00Z',
};

describe('HelpRequestCard', () => {
  it('zeigt Kategorie-Label und Beschreibung an', () => {
    render(<HelpRequestCard request={baseRequest} />);

    expect(screen.getByText('Einkaufen')).toBeInTheDocument();
    expect(screen.getByText('Brauche Hilfe beim Wocheneinkauf im Rewe.')).toBeInTheDocument();
  });

  it('zeigt "Ich helfe" Button wenn Status open ist', () => {
    const onApply = vi.fn();
    render(<HelpRequestCard request={baseRequest} onApply={onApply} showApplyButton />);

    const btn = screen.getByRole('button', { name: /Ich helfe/ });
    expect(btn).toBeInTheDocument();
  });

  it('versteckt Button wenn Status nicht open ist', () => {
    const matchedRequest: HelpRequest = { ...baseRequest, status: 'matched' };
    const onApply = vi.fn();
    render(<HelpRequestCard request={matchedRequest} onApply={onApply} showApplyButton />);

    expect(screen.queryByRole('button', { name: /Ich helfe/ })).not.toBeInTheDocument();
  });
});
