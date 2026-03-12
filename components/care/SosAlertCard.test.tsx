// components/care/SosAlertCard.test.tsx
// Nachbar.io — Tests fuer SOS-Alert-Karte (Helfer-Benachrichtigung)

import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { SosAlertCard } from './SosAlertCard';
import type { CareSosAlert } from '@/lib/care/types';

vi.mock('lucide-react', () => ({
  Clock: (props: Record<string, unknown>) => <svg data-testid="clock-icon" {...props} />,
  User: (props: Record<string, unknown>) => <svg data-testid="user-icon" {...props} />,
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function createTestAlert(overrides: Partial<CareSosAlert> = {}): CareSosAlert {
  return {
    id: 'alert-1',
    senior_id: 'user-1',
    category: 'general_help',
    status: 'triggered',
    current_escalation_level: 1,
    escalated_at: [],
    accepted_by: null,
    resolved_by: null,
    resolved_at: null,
    notes: null,
    source: 'app',
    created_at: new Date(Date.now() - 3 * 60 * 1000).toISOString(), // 3 Minuten her
    ...overrides,
  };
}

describe('SosAlertCard', () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
    globalThis.fetch = mockFetch;
  });

  it('zeigt Kategorie-Label', () => {
    render(<SosAlertCard alert={createTestAlert()} />);
    expect(screen.getByText('Allgemeine Hilfe')).toBeInTheDocument();
  });

  it('zeigt Kategorie-Icon', () => {
    render(<SosAlertCard alert={createTestAlert()} />);
    // Allgemeine Hilfe hat 🤝 Icon
    expect(screen.getByText('🤝')).toBeInTheDocument();
  });

  it('zeigt Eskalationsstufe', () => {
    render(<SosAlertCard alert={createTestAlert({ current_escalation_level: 2 })} />);
    expect(screen.getByText(/Stufe 2/)).toBeInTheDocument();
  });

  it('zeigt vergangene Zeit', () => {
    render(<SosAlertCard alert={createTestAlert()} />);
    expect(screen.getByText(/Vor \d+ Min\./)).toBeInTheDocument();
  });

  it('zeigt Senior-Name wenn vorhanden', () => {
    const alert = createTestAlert();
    alert.senior = { display_name: 'Frau Mueller', avatar_url: null };
    render(<SosAlertCard alert={alert} />);
    expect(screen.getByText('Frau Mueller')).toBeInTheDocument();
  });

  it('zeigt Notizen wenn vorhanden', () => {
    render(<SosAlertCard alert={createTestAlert({ notes: 'Bin gestuerzt' })} />);
    expect(screen.getByText('Bin gestuerzt')).toBeInTheDocument();
  });

  describe('Aktions-Buttons', () => {
    it('zeigt "Ich helfe" und "Kann nicht" fuer triggered-Status', () => {
      render(<SosAlertCard alert={createTestAlert({ status: 'triggered' })} />);
      expect(screen.getByText(/Ich helfe/)).toBeInTheDocument();
      expect(screen.getByText('Kann nicht')).toBeInTheDocument();
    });

    it('zeigt "Ich helfe" und "Kann nicht" fuer notified-Status', () => {
      render(<SosAlertCard alert={createTestAlert({ status: 'notified' })} />);
      expect(screen.getByText(/Ich helfe/)).toBeInTheDocument();
      expect(screen.getByText('Kann nicht')).toBeInTheDocument();
    });

    it('zeigt "Ich helfe" und "Kann nicht" fuer escalated-Status', () => {
      render(<SosAlertCard alert={createTestAlert({ status: 'escalated' })} />);
      expect(screen.getByText(/Ich helfe/)).toBeInTheDocument();
    });

    it('versteckt Aktions-Buttons bei accepted-Status', () => {
      render(<SosAlertCard alert={createTestAlert({ status: 'accepted' })} />);
      expect(screen.queryByText('Kann nicht')).not.toBeInTheDocument();
    });

    it('versteckt Aktions-Buttons bei resolved-Status', () => {
      render(<SosAlertCard alert={createTestAlert({ status: 'resolved' })} />);
      expect(screen.queryByText('Kann nicht')).not.toBeInTheDocument();
    });

    it('versteckt Aktions-Buttons wenn showActions=false', () => {
      render(<SosAlertCard alert={createTestAlert()} showActions={false} />);
      expect(screen.queryByText('Kann nicht')).not.toBeInTheDocument();
    });

    it('sendet accepted-Response bei Klick auf "Ich helfe"', async () => {
      render(<SosAlertCard alert={createTestAlert()} />);
      fireEvent.click(screen.getByText(/Ich helfe/));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/care/sos/alert-1/respond', expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"response_type":"accepted"'),
        }));
      });
    });

    it('sendet declined-Response bei Klick auf "Kann nicht"', async () => {
      render(<SosAlertCard alert={createTestAlert()} />);
      fireEvent.click(screen.getByText('Kann nicht'));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/care/sos/alert-1/respond', expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"response_type":"declined"'),
        }));
      });
    });

    it('ruft onAccept Callback bei accepted', async () => {
      const onAccept = vi.fn();
      render(<SosAlertCard alert={createTestAlert()} onAccept={onAccept} />);
      fireEvent.click(screen.getByText(/Ich helfe/));

      await waitFor(() => {
        expect(onAccept).toHaveBeenCalledTimes(1);
      });
    });

    it('ruft onDecline Callback bei declined', async () => {
      const onDecline = vi.fn();
      render(<SosAlertCard alert={createTestAlert()} onDecline={onDecline} />);
      fireEvent.click(screen.getByText('Kann nicht'));

      await waitFor(() => {
        expect(onDecline).toHaveBeenCalledTimes(1);
      });
    });

    it('Aktions-Buttons haben touchAction: manipulation', () => {
      render(<SosAlertCard alert={createTestAlert()} />);
      const buttons = screen.getAllByRole('button');
      buttons.forEach(btn => {
        expect(btn.style.touchAction).toBe('manipulation');
      });
    });
  });

  it('zeigt "Hilfe ist unterwegs" bei accepted-Status', () => {
    render(<SosAlertCard alert={createTestAlert({ status: 'accepted' })} />);
    expect(screen.getByText(/Hilfe ist unterwegs/)).toBeInTheDocument();
  });

  describe('Notfall-Styling', () => {
    it('hat roten Rahmen fuer medical_emergency', () => {
      const { container } = render(<SosAlertCard alert={createTestAlert({ category: 'medical_emergency' })} />);
      const card = container.firstChild as HTMLElement;
      expect(card.className).toContain('border-emergency-red');
    });

    it('hat amber Rahmen fuer general_help', () => {
      const { container } = render(<SosAlertCard alert={createTestAlert({ category: 'general_help' })} />);
      const card = container.firstChild as HTMLElement;
      expect(card.className).toContain('border-alert-amber');
    });
  });
});
