// components/care/TaskCard.test.tsx
// Nachbar.io — Tests fuer Aufgaben-Karte (Nachbarschaftshilfe)

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { TaskCard } from './TaskCard';
import type { CareTask } from './TaskCard';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const mockTask: CareTask = {
  id: 'task-1',
  creator_id: 'user-1',
  title: 'Fahrt zum Arzt',
  description: 'Donnerstag 14 Uhr, Rheinfelden',
  category: 'transport',
  urgency: 'normal',
  preferred_date: '2026-03-20',
  preferred_time: null,
  status: 'open',
  claimer_id: null,
  claimer_name: null,
  creator_name: 'Herr Schmidt',
  created_at: '2026-03-15T10:00:00Z',
};

describe('TaskCard', () => {
  it('zeigt Titel an', () => {
    render(<TaskCard task={mockTask} currentUserId="user-2" />);
    expect(screen.getByText('Fahrt zum Arzt')).toBeInTheDocument();
  });

  it('zeigt Kategorie-Label', () => {
    render(<TaskCard task={mockTask} currentUserId="user-2" />);
    expect(screen.getByText(/Fahrdienst/)).toBeInTheDocument();
  });

  it('zeigt Ersteller-Name', () => {
    render(<TaskCard task={mockTask} currentUserId="user-2" />);
    expect(screen.getByText(/Herr Schmidt/)).toBeInTheDocument();
  });

  it('zeigt Ich-helfe-Button fuer andere Nutzer', () => {
    render(<TaskCard task={mockTask} currentUserId="user-2" />);
    expect(screen.getByText('Ich helfe')).toBeInTheDocument();
  });

  it('zeigt KEINEN Ich-helfe-Button fuer Ersteller', () => {
    render(<TaskCard task={mockTask} currentUserId="user-1" />);
    expect(screen.queryByText('Ich helfe')).not.toBeInTheDocument();
  });

  it('zeigt Beschreibung', () => {
    render(<TaskCard task={mockTask} currentUserId="user-2" />);
    expect(screen.getByText('Donnerstag 14 Uhr, Rheinfelden')).toBeInTheDocument();
  });

  it('zeigt KEINE Beschreibung wenn null', () => {
    const ohneBeschreibung = { ...mockTask, description: null };
    render(<TaskCard task={ohneBeschreibung} currentUserId="user-2" />);
    expect(screen.queryByText('Donnerstag 14 Uhr, Rheinfelden')).not.toBeInTheDocument();
  });

  it('zeigt Stornieren fuer Ersteller', () => {
    render(<TaskCard task={mockTask} currentUserId="user-1" />);
    expect(screen.getByText('Stornieren')).toBeInTheDocument();
  });

  it('zeigt KEINEN Stornieren-Button fuer andere Nutzer', () => {
    render(<TaskCard task={mockTask} currentUserId="user-2" />);
    expect(screen.queryByText('Stornieren')).not.toBeInTheDocument();
  });

  it('zeigt Status-Badge "Offen"', () => {
    render(<TaskCard task={mockTask} currentUserId="user-2" />);
    expect(screen.getByText('Offen')).toBeInTheDocument();
  });

  it('zeigt Status-Badge "Angenommen" bei claimed', () => {
    const claimed = { ...mockTask, status: 'claimed' as const, claimer_id: 'user-2', claimer_name: 'Frau Mueller' };
    render(<TaskCard task={claimed} currentUserId="user-3" />);
    expect(screen.getByText('Angenommen')).toBeInTheDocument();
  });

  it('zeigt Helfer-Info bei angenommener Aufgabe', () => {
    const claimed = { ...mockTask, status: 'claimed' as const, claimer_id: 'user-2', claimer_name: 'Frau Mueller' };
    render(<TaskCard task={claimed} currentUserId="user-3" />);
    expect(screen.getByText('Frau Mueller')).toBeInTheDocument();
  });

  it('zeigt Wunschdatum wenn angegeben', () => {
    render(<TaskCard task={mockTask} currentUserId="user-2" />);
    expect(screen.getByText(/Gewuenscht/)).toBeInTheDocument();
  });

  it('Ich-helfe-Button hat minHeight 48px (Touch-Target)', () => {
    render(<TaskCard task={mockTask} currentUserId="user-2" />);
    const button = screen.getByText('Ich helfe');
    expect(button.style.minHeight).toBe('48px');
  });

  it('Ich-helfe-Button hat touchAction: manipulation', () => {
    render(<TaskCard task={mockTask} currentUserId="user-2" />);
    const button = screen.getByText('Ich helfe');
    expect(button.style.touchAction).toBe('manipulation');
  });
});
