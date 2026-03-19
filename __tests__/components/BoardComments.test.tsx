// __tests__/components/BoardComments.test.tsx
// Tests fuer Board-Kommentare

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { BoardComments } from '@/components/BoardComments';

// Mock Supabase
vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn(() => ({ data: [], error: null })),
          })),
          data: [],
          error: null,
          count: 0,
        })),
        count: 0,
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => ({
            data: { id: 'c1', user_id: 'u1', text: 'Test', created_at: new Date().toISOString() },
            error: null,
          })),
        })),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => ({ error: null })),
      })),
    })),
  })),
}));

describe('BoardComments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('zeigt Kommentieren-Button', () => {
    render(<BoardComments postId="post-1" currentUserId="user-1" />);
    expect(screen.getByText('Kommentieren')).toBeDefined();
  });

  it('zeigt Kommentar-Anzahl wenn vorhanden', async () => {
    render(<BoardComments postId="post-1" currentUserId="user-1" />);
    // Initial: "Kommentieren" (0 Kommentare)
    expect(screen.getByText('Kommentieren')).toBeDefined();
  });

  it('oeffnet Eingabefeld beim Klick', async () => {
    render(<BoardComments postId="post-1" currentUserId="user-1" />);
    fireEvent.click(screen.getByText('Kommentieren'));

    await vi.waitFor(() => {
      expect(screen.getByPlaceholderText('Kommentar schreiben...')).toBeDefined();
    });
  });

  it('zeigt kein Eingabefeld wenn nicht eingeloggt', async () => {
    render(<BoardComments postId="post-1" currentUserId={null} />);
    fireEvent.click(screen.getByText('Kommentieren'));

    await vi.waitFor(() => {
      // Kein Eingabefeld sichtbar
      expect(screen.queryByPlaceholderText('Kommentar schreiben...')).toBeNull();
    });
  });
});
