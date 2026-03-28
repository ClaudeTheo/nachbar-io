// components/care/ShoppingRequestCard.test.tsx
// Nachbar.io — Tests für Einkaufsanfrage-Karte

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { ShoppingRequestCard } from './ShoppingRequestCard';
import type { ShoppingRequest } from './ShoppingRequestCard';

vi.mock('lucide-react', () => ({
  Check: (props: Record<string, unknown>) => <svg data-testid="check-icon" {...props} />,
  Clock: (props: Record<string, unknown>) => <svg data-testid="clock-icon" {...props} />,
  Package: (props: Record<string, unknown>) => <svg data-testid="package-icon" {...props} />,
  ShoppingCart: (props: Record<string, unknown>) => <svg data-testid="cart-icon" {...props} />,
  Truck: (props: Record<string, unknown>) => <svg data-testid="truck-icon" {...props} />,
  UserCheck: (props: Record<string, unknown>) => <svg data-testid="usercheck-icon" {...props} />,
  X: (props: Record<string, unknown>) => <svg data-testid="x-icon" {...props} />,
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const mockRequest: ShoppingRequest = {
  id: 'req-1',
  requester_id: 'user-1',
  items: [
    { name: 'Milch', quantity: '1L', checked: false },
    { name: 'Brot', quantity: '1 Laib', checked: false },
  ],
  note: 'Bitte laktosefrei',
  status: 'open',
  claimed_by: null,
  claimed_at: null,
  delivered_at: null,
  confirmed_at: null,
  due_date: '2026-03-20',
  created_at: '2026-03-15T10:00:00Z',
  requester: { display_name: 'Frau Müller' },
  claimer: undefined,
};

describe('ShoppingRequestCard', () => {
  it('zeigt Artikelliste an', () => {
    render(<ShoppingRequestCard request={mockRequest} currentUserId="user-2" />);
    expect(screen.getByText('Milch')).toBeInTheDocument();
    expect(screen.getByText('Brot')).toBeInTheDocument();
  });

  it('zeigt Mengenangaben in Klammern', () => {
    render(<ShoppingRequestCard request={mockRequest} currentUserId="user-2" />);
    expect(screen.getByText('(1L)')).toBeInTheDocument();
    expect(screen.getByText('(1 Laib)')).toBeInTheDocument();
  });

  it('zeigt Übernahme-Button für andere Nutzer', () => {
    render(<ShoppingRequestCard request={mockRequest} currentUserId="user-2" />);
    expect(screen.getByText('Ich übernehme das')).toBeInTheDocument();
  });

  it('zeigt keinen Übernahme-Button für Ersteller', () => {
    render(<ShoppingRequestCard request={mockRequest} currentUserId="user-1" />);
    expect(screen.queryByText('Ich übernehme das')).not.toBeInTheDocument();
  });

  it('zeigt Stornieren-Button für Ersteller bei Status open', () => {
    render(<ShoppingRequestCard request={mockRequest} currentUserId="user-1" />);
    expect(screen.getByText('Stornieren')).toBeInTheDocument();
  });

  it('zeigt Notiz an', () => {
    render(<ShoppingRequestCard request={mockRequest} currentUserId="user-2" />);
    expect(screen.getByText('Bitte laktosefrei')).toBeInTheDocument();
  });

  it('zeigt KEINE Notiz wenn null', () => {
    const ohneNotiz = { ...mockRequest, note: null };
    render(<ShoppingRequestCard request={ohneNotiz} currentUserId="user-2" />);
    expect(screen.queryByText('Bitte laktosefrei')).not.toBeInTheDocument();
  });

  it('zeigt Status-Badge "Offen"', () => {
    render(<ShoppingRequestCard request={mockRequest} currentUserId="user-2" />);
    expect(screen.getByText('Offen')).toBeInTheDocument();
  });

  it('zeigt Status-Badge "Übernommen" bei claimed', () => {
    const claimed = { ...mockRequest, status: 'claimed' as const, claimed_by: 'user-2', claimer: { display_name: 'Herr Schmidt' } };
    render(<ShoppingRequestCard request={claimed} currentUserId="user-3" />);
    expect(screen.getByText('Übernommen')).toBeInTheDocument();
  });

  it('zeigt Ersteller-Name an', () => {
    render(<ShoppingRequestCard request={mockRequest} currentUserId="user-2" />);
    expect(screen.getByText('Frau Müller')).toBeInTheDocument();
  });

  it('zeigt "Unbekannt" wenn kein Display-Name', () => {
    const ohneNamen = { ...mockRequest, requester: { display_name: null } };
    render(<ShoppingRequestCard request={ohneNamen} currentUserId="user-2" />);
    expect(screen.getByText('Unbekannt')).toBeInTheDocument();
  });

  it('zeigt Übernehmenden bei claimed-Status', () => {
    const claimed = {
      ...mockRequest,
      status: 'claimed' as const,
      claimed_by: 'user-2',
      claimer: { display_name: 'Herr Schmidt' },
    };
    render(<ShoppingRequestCard request={claimed} currentUserId="user-3" />);
    expect(screen.getByText(/Übernommen von Herr Schmidt/)).toBeInTheDocument();
  });

  it('Übernahme-Button hat minHeight 48px (Touch-Target)', () => {
    render(<ShoppingRequestCard request={mockRequest} currentUserId="user-2" />);
    const button = screen.getByText('Ich übernehme das');
    expect(button.style.minHeight).toBe('48px');
  });

  it('Übernahme-Button hat touchAction: manipulation', () => {
    render(<ShoppingRequestCard request={mockRequest} currentUserId="user-2" />);
    const button = screen.getByText('Ich übernehme das');
    expect(button.style.touchAction).toBe('manipulation');
  });
});
