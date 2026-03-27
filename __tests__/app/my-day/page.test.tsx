import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import React from 'react';

// Mocks (next/navigation und next/link sind bereits in vitest.setup.ts gemockt)
vi.mock('lucide-react', () => ({
  Heart: (props: Record<string, unknown>) => <svg data-testid="icon-heart" {...props} />,
  Pill: (props: Record<string, unknown>) => <svg data-testid="icon-pill" {...props} />,
  Calendar: (props: Record<string, unknown>) => <svg data-testid="icon-calendar" {...props} />,
  Phone: (props: Record<string, unknown>) => <svg data-testid="icon-phone" {...props} />,
  AlertTriangle: (props: Record<string, unknown>) => <svg data-testid="icon-alert" {...props} />,
  HandHeart: (props: Record<string, unknown>) => <svg data-testid="icon-hand-heart" {...props} />,
  Trash2: (props: Record<string, unknown>) => <svg data-testid="icon-trash" {...props} />,
  Clock: (props: Record<string, unknown>) => <svg data-testid="icon-clock" {...props} />,
  CheckCircle2: (props: Record<string, unknown>) => <svg data-testid="icon-check" {...props} />,
  Smile: (props: Record<string, unknown>) => <svg data-testid="icon-smile" {...props} />,
  Meh: (props: Record<string, unknown>) => <svg data-testid="icon-meh" {...props} />,
  Frown: (props: Record<string, unknown>) => <svg data-testid="icon-frown" {...props} />,
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) => <div {...props}>{children}</div>,
  CardContent: ({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) => <div {...props}>{children}</div>,
}));

vi.mock('@/components/illustrations/IllustrationRenderer', () => ({
  IllustrationRenderer: () => <div data-testid="illustration" />,
}));

vi.mock('@/lib/haptics', () => ({
  haptic: vi.fn(),
}));

vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({ user: { id: 'user-001' }, loading: false }),
}));

// Supabase mock
const mockHeartbeats = [{ created_at: new Date(Date.now() - 5 * 60000).toISOString() }];
const mockInsert = vi.fn(() => Promise.resolve({ error: null }));

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: (table: string) => {
      if (table === 'heartbeats') {
        return {
          select: () => ({
            eq: () => ({
              order: () => ({
                limit: () => Promise.resolve({ data: mockHeartbeats, error: null }),
              }),
            }),
          }),
        };
      }
      if (table === 'checkins') {
        return {
          select: () => ({
            eq: () => ({
              gte: () => ({
                limit: () => Promise.resolve({ data: [], error: null }),
              }),
            }),
          }),
          insert: mockInsert,
        };
      }
      if (table === 'waste_collection_dates') {
        return {
          select: () => ({
            eq: () => ({
              limit: () => Promise.resolve({ data: [], error: null }),
            }),
          }),
        };
      }
      return { select: () => ({ eq: () => ({ limit: () => Promise.resolve({ data: [], error: null }) }) }) };
    },
  }),
}));

import MyDayPage from '@/app/(app)/my-day/page';

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

describe('MyDayPage', () => {
  it('rendert die Seite mit Check-in Karte', async () => {
    render(<MyDayPage />);
    await waitFor(() => {
      expect(screen.getByTestId('my-day-page')).toBeInTheDocument();
      expect(screen.getByTestId('checkin-card')).toBeInTheDocument();
    });
  });

  it('zeigt drei Check-in Optionen (gut/geht so/nicht gut)', async () => {
    render(<MyDayPage />);
    await waitFor(() => {
      expect(screen.getByTestId('checkin-good')).toBeInTheDocument();
      expect(screen.getByTestId('checkin-okay')).toBeInTheDocument();
      expect(screen.getByTestId('checkin-bad')).toBeInTheDocument();
    });
  });

  it('zeigt Bestaetigung nach Check-in Klick', async () => {
    render(<MyDayPage />);
    await waitFor(() => {
      expect(screen.getByTestId('checkin-good')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId('checkin-good'));
    await waitFor(() => {
      expect(screen.getByText('Check-in gespeichert')).toBeInTheDocument();
    });
  });

  it('zeigt Tageskalender-Bereich', async () => {
    render(<MyDayPage />);
    await waitFor(() => {
      expect(screen.getByTestId('day-calendar')).toBeInTheDocument();
    });
  });

  it('zeigt Medikamenten-Bereich', async () => {
    render(<MyDayPage />);
    await waitFor(() => {
      expect(screen.getByTestId('medication-card')).toBeInTheDocument();
    });
  });

  it('zeigt Schnellaktionen mit 80px Touch-Targets', async () => {
    render(<MyDayPage />);
    await waitFor(() => {
      expect(screen.getByTestId('quick-actions-myday')).toBeInTheDocument();
    });
    // Alle Links haben min-height 80px (Senior-Regel)
    const links = screen.getByTestId('quick-actions-myday').querySelectorAll('a');
    expect(links.length).toBe(3);
    links.forEach((link) => {
      expect(link.style.minHeight).toBe('80px');
    });
  });

  it('zeigt Heartbeat-Info', async () => {
    render(<MyDayPage />);
    await waitFor(() => {
      expect(screen.getByText(/Letzte Aktivitaet/)).toBeInTheDocument();
    });
  });
});
