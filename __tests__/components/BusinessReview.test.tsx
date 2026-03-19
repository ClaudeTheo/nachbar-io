// __tests__/components/BusinessReview.test.tsx
// Tests fuer Dienstleister-Bewertungen

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { BusinessReview } from '@/components/BusinessReview';

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({ data: [], error: null })),
        })),
      })),
      insert: vi.fn(() => ({ error: null })),
    })),
  })),
}));

describe('BusinessReview', () => {
  beforeEach(() => { vi.clearAllMocks(); });
  afterEach(() => { cleanup(); });

  it('zeigt Bewertungen-Ueberschrift', async () => {
    render(<BusinessReview tipId="tip-1" currentUserId="user-1" />);
    await vi.waitFor(() => {
      expect(screen.getByText('Bewertungen')).toBeDefined();
    });
  });

  it('zeigt Bewertung-abgeben-Button wenn eingeloggt', async () => {
    render(<BusinessReview tipId="tip-1" currentUserId="user-1" />);
    await vi.waitFor(() => {
      expect(screen.getByText('Bewertung abgeben')).toBeDefined();
    });
  });

  it('zeigt keinen Button wenn nicht eingeloggt', async () => {
    render(<BusinessReview tipId="tip-1" currentUserId={null} />);
    await vi.waitFor(() => {
      expect(screen.getByText('Bewertungen')).toBeDefined();
    });
    expect(screen.queryByText('Bewertung abgeben')).toBeNull();
  });

  it('oeffnet Formular beim Klick', async () => {
    render(<BusinessReview tipId="tip-1" currentUserId="user-1" />);
    await vi.waitFor(() => {
      expect(screen.getByText('Bewertung abgeben')).toBeDefined();
    });
    fireEvent.click(screen.getByText('Bewertung abgeben'));
    expect(screen.getByText('Ihre Bewertung')).toBeDefined();
    expect(screen.getByPlaceholderText('Kommentar (optional)')).toBeDefined();
  });

  it('zeigt 5 Sterne im Formular', async () => {
    render(<BusinessReview tipId="tip-1" currentUserId="user-1" />);
    await vi.waitFor(() => {
      expect(screen.getByText('Bewertung abgeben')).toBeDefined();
    });
    fireEvent.click(screen.getByText('Bewertung abgeben'));
    // 5 Stern-Buttons
    const starButtons = screen.getAllByRole('button', { name: /Stern/ });
    expect(starButtons.length).toBe(5);
  });
});
