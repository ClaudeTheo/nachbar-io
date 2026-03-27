// components/care/senior/SeniorCheckinButtons.test.tsx
// Nachbar.io — Tests für Senior-Modus Check-in Buttons
// KRITISCH: 80px Touch-Targets, korrekte Status-Zuordnung

import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { SeniorCheckinButtons } from './SeniorCheckinButtons';

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn(), back: vi.fn(), prefetch: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('SeniorCheckinButtons', () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
    globalThis.fetch = mockFetch as typeof fetch;
  });

  it('zeigt alle 3 Stimmungs-Buttons', () => {
    render(<SeniorCheckinButtons />);
    expect(screen.getByText(/Mir geht es gut/)).toBeInTheDocument();
    expect(screen.getByText(/Nicht so gut/)).toBeInTheDocument();
    expect(screen.getByText(/Brauche Hilfe/)).toBeInTheDocument();
  });

  it('sendet status "ok" + mood "good" bei "Mir geht es gut"', async () => {
    render(<SeniorCheckinButtons />);
    fireEvent.click(screen.getByText(/Mir geht es gut/));

    await waitFor(() => {
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.status).toBe('ok');
      expect(body.mood).toBe('good');
    });
  });

  it('sendet status "not_well" + mood "neutral" bei "Nicht so gut"', async () => {
    render(<SeniorCheckinButtons />);
    fireEvent.click(screen.getByText(/Nicht so gut/));

    await waitFor(() => {
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.status).toBe('not_well');
      expect(body.mood).toBe('neutral');
    });
  });

  it('sendet status "need_help" + mood "bad" bei "Brauche Hilfe"', async () => {
    render(<SeniorCheckinButtons />);
    fireEvent.click(screen.getByText(/Brauche Hilfe/));

    await waitFor(() => {
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.status).toBe('need_help');
      expect(body.mood).toBe('bad');
    });
  });

  it('navigiert zu /confirmed nach erfolgreichem Check-in', async () => {
    render(<SeniorCheckinButtons />);
    fireEvent.click(screen.getByText(/Mir geht es gut/));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/confirmed');
    });
  });

  it('navigiert NICHT bei API-Fehler', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, json: () => Promise.resolve({}) });

    render(<SeniorCheckinButtons />);
    fireEvent.click(screen.getByText(/Mir geht es gut/));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('sendet scheduled_at wenn angegeben', async () => {
    render(<SeniorCheckinButtons scheduledAt="2026-03-12T08:00:00Z" />);
    fireEvent.click(screen.getByText(/Mir geht es gut/));

    await waitFor(() => {
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.scheduled_at).toBe('2026-03-12T08:00:00Z');
    });
  });

  it('alle Buttons haben minHeight 80px (Senior Touch-Target)', () => {
    render(<SeniorCheckinButtons />);
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(3);
    buttons.forEach(btn => {
      expect(btn.style.minHeight).toBe('80px');
    });
  });

  it('alle Buttons haben touchAction: manipulation', () => {
    render(<SeniorCheckinButtons />);
    const buttons = screen.getAllByRole('button');
    buttons.forEach(btn => {
      expect(btn.style.touchAction).toBe('manipulation');
    });
  });

  it('sendet Anfrage an /api/care/checkin', async () => {
    render(<SeniorCheckinButtons />);
    fireEvent.click(screen.getByText(/Mir geht es gut/));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/care/checkin', expect.objectContaining({
        method: 'POST',
      }));
    });
  });
});
