import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import VideochatScreen from '../../screens/VideochatScreen';

// Mock useTerminal
vi.mock('@/lib/terminal/TerminalContext', () => ({
  useTerminal: () => ({
    setActiveScreen: vi.fn(),
    data: { userName: 'Frau Müller' },
  }),
}));

const mockContacts = [
  {
    id: 'link-1',
    caregiver_id: 'user-lisa',
    caregiver_name: 'Lisa',
    caregiver_avatar: null,
    auto_answer_allowed: true,
    auto_answer_start: '08:00',
    auto_answer_end: '20:00',
    is_online: true,
  },
  {
    id: 'link-2',
    caregiver_id: 'user-thomas',
    caregiver_name: 'Thomas',
    caregiver_avatar: null,
    auto_answer_allowed: false,
    auto_answer_start: '08:00',
    auto_answer_end: '20:00',
    is_online: false,
  },
];

beforeEach(() => {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ contacts: mockContacts }),
  });
});

afterEach(() => {
  cleanup();
});

describe('VideochatScreen (Kiosk)', () => {
  it('zeigt Überschrift "Videoanruf"', async () => {
    render(<VideochatScreen />);
    expect(await screen.findByText('Videoanruf')).toBeInTheDocument();
  });

  it('zeigt Kontakte mit Namen', async () => {
    render(<VideochatScreen />);
    expect(await screen.findByText('Lisa')).toBeInTheDocument();
    expect(screen.getByText('Thomas')).toBeInTheDocument();
  });

  it('zeigt Online-Status (grüner Punkt für Lisa)', async () => {
    render(<VideochatScreen />);
    const lisa = await screen.findByText('Lisa');
    const card = lisa.closest('[data-testid="contact-card"]');
    expect(card?.querySelector('[data-online="true"]')).toBeInTheDocument();
  });

  it('Anrufen-Buttons haben min 80px (Senior-Modus)', async () => {
    render(<VideochatScreen />);
    const buttons = await screen.findAllByRole('button', { name: /anrufen/i });
    expect(buttons.length).toBeGreaterThan(0);
    buttons.forEach(btn => {
      expect(btn.className).toMatch(/min-h-\[80px\]/);
    });
  });

  it('zeigt Zurück-Button', async () => {
    render(<VideochatScreen />);
    expect(screen.getByRole('button', { name: /zurück/i })).toBeInTheDocument();
  });
});
