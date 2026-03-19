// __tests__/components/EventRecap.test.tsx
// Tests fuer Event-Nachbericht-Komponente

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { EventRecap } from '@/components/EventRecap';

// Mock Supabase
vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            data: [],
            error: null,
          })),
        })),
      })),
      insert: vi.fn(() => ({ error: null })),
    })),
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(() => ({ error: null })),
        getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'https://example.com/img.jpg' } })),
      })),
    },
  })),
}));

describe('EventRecap', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('zeigt nichts wenn Event noch nicht vorbei ist', () => {
    // Event in der Zukunft
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];

    const { container } = render(
      <EventRecap eventId="evt-1" eventDate={dateStr} currentUserId="user-1" />
    );

    expect(container.innerHTML).toBe('');
  });

  it('zeigt Rueckblick-Bereich wenn Event vorbei ist', async () => {
    // Event gestern
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 2);
    const dateStr = yesterday.toISOString().split('T')[0];

    render(
      <EventRecap eventId="evt-1" eventDate={dateStr} currentUserId="user-1" />
    );

    // Warten auf async loadRecaps
    await vi.waitFor(() => {
      expect(screen.getByText('Rückblick')).toBeDefined();
    });
  });

  it('zeigt Button wenn eingeloggt und kein eigener Nachbericht', async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 2);
    const dateStr = yesterday.toISOString().split('T')[0];

    render(
      <EventRecap eventId="evt-1" eventDate={dateStr} currentUserId="user-1" />
    );

    await vi.waitFor(() => {
      expect(screen.getByText(/Nachbericht verfassen/)).toBeDefined();
    });
  });

  it('zeigt keinen Button wenn nicht eingeloggt', async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 2);
    const dateStr = yesterday.toISOString().split('T')[0];

    render(
      <EventRecap eventId="evt-1" eventDate={dateStr} currentUserId={null} />
    );

    await vi.waitFor(() => {
      expect(screen.getAllByText('Rückblick').length).toBeGreaterThan(0);
    });

    expect(screen.queryByText(/Nachbericht verfassen/)).toBeNull();
  });
});
