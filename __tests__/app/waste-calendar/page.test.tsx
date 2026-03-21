// __tests__/app/waste-calendar/page.test.tsx
// Tests fuer den Quartier-Kalender (Muell + Amtsblatt)

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { ANNOUNCEMENT_CALENDAR_COLORS, ANNOUNCEMENT_CATEGORIES } from '@/lib/municipal/constants';
import type { CalendarAnnouncementEvent, AnnouncementCategory } from '@/lib/municipal/types';

// --- Konstanten-Tests ---

describe('ANNOUNCEMENT_CALENDAR_COLORS', () => {
  it('enthaelt Farben fuer alle 9 Kategorien', () => {
    const expectedCategories: AnnouncementCategory[] = [
      'veranstaltung', 'verkehr', 'baustelle', 'warnung',
      'soziales', 'verein', 'entsorgung', 'verwaltung', 'sonstiges',
    ];
    for (const cat of expectedCategories) {
      expect(ANNOUNCEMENT_CALENDAR_COLORS[cat]).toBeDefined();
      expect(ANNOUNCEMENT_CALENDAR_COLORS[cat]).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it('verkehr und baustelle haben gleiche Farbe (Orange)', () => {
    expect(ANNOUNCEMENT_CALENDAR_COLORS.verkehr).toBe('#F97316');
    expect(ANNOUNCEMENT_CALENDAR_COLORS.baustelle).toBe('#F97316');
  });

  it('warnung hat Rot', () => {
    expect(ANNOUNCEMENT_CALENDAR_COLORS.warnung).toBe('#EF4444');
  });

  it('veranstaltung hat Violett', () => {
    expect(ANNOUNCEMENT_CALENDAR_COLORS.veranstaltung).toBe('#8B5CF6');
  });
});

describe('CalendarAnnouncementEvent Type', () => {
  it('kann ein gueltiges Event-Objekt erstellen', () => {
    const event: CalendarAnnouncementEvent = {
      id: 'test-1',
      title: 'Sperrung B34',
      category: 'verkehr',
      published_at: '2026-03-15T10:00:00Z',
      expires_at: '2026-04-01T00:00:00Z',
      source_url: 'https://example.com',
    };
    expect(event.id).toBe('test-1');
    expect(event.category).toBe('verkehr');
    expect(event.expires_at).toBeTruthy();
  });

  it('erlaubt null fuer optionale Felder', () => {
    const event: CalendarAnnouncementEvent = {
      id: 'test-2',
      title: 'Vereinsversammlung',
      category: 'verein',
      published_at: '2026-03-20T08:00:00Z',
      expires_at: null,
      source_url: null,
    };
    expect(event.expires_at).toBeNull();
    expect(event.source_url).toBeNull();
  });
});

// --- Komponenten-Tests ---

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

// Supabase Mock
const mockWasteCollections = [
  {
    id: 'wc-1',
    waste_type: 'restmuell',
    collection_date: '2026-03-25',
    notes: null,
    source: 'ical',
    area_id: 'area-1',
    source_id: 'src-1',
    is_cancelled: false,
  },
];

const mockAnnouncements = [
  {
    id: 'ann-1',
    title: 'Straßenfest Innenstadt',
    category: 'veranstaltung',
    published_at: '2026-03-25T10:00:00Z',
    expires_at: null,
    source_url: 'https://bad-saeckingen.de/fest',
  },
  {
    id: 'ann-2',
    title: 'B34 Vollsperrung',
    category: 'verkehr',
    published_at: '2026-03-26T08:00:00Z',
    expires_at: '2026-04-05T00:00:00Z',
    source_url: null,
  },
];

// Supabase Query-Chain Builder
function createChain(data: unknown, opts?: { isSingle?: boolean }) {
  const chain: Record<string, unknown> = {};
  const methods = ['select', 'eq', 'in', 'gte', 'lte', 'order', 'single'];
  for (const m of methods) {
    chain[m] = vi.fn(() => chain);
  }
  // Terminiert: Promise.all-kompatibel
  chain.then = vi.fn((resolve: (val: unknown) => void) => {
    resolve({ data, error: null });
    return { catch: vi.fn() };
  });
  return chain;
}

const mockFrom = vi.fn((table: string) => {
  if (table === 'quarter_collection_areas') {
    return createChain([{ area_id: 'area-1' }]);
  }
  if (table === 'waste_collection_dates') {
    return createChain(mockWasteCollections);
  }
  if (table === 'waste_schedules') {
    return createChain([]);
  }
  if (table === 'waste_reminders') {
    return createChain([]);
  }
  if (table === 'municipal_announcements') {
    return createChain(mockAnnouncements);
  }
  return createChain([]);
});

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: mockFrom,
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }),
    },
  }),
}));

vi.mock('@/lib/quarters', () => ({
  useQuarter: () => ({
    currentQuarter: { id: 'quarter-bs', name: 'Bad Säckingen' },
    loading: false,
  }),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

// Dynamischer Import nach Mocks
const { default: WasteCalendarPage } = await import('@/app/(app)/waste-calendar/page');

describe('WasteCalendarPage (Quartier-Kalender)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('zeigt den Titel "Quartier-Kalender"', async () => {
    render(<WasteCalendarPage />);
    await waitFor(() => {
      expect(screen.getByText('Quartier-Kalender')).toBeDefined();
    });
  });

  it('zeigt den Untertitel', async () => {
    render(<WasteCalendarPage />);
    await waitFor(() => {
      expect(screen.getByText('Mülltermine & Veranstaltungen in Ihrem Quartier')).toBeDefined();
    });
  });

  it('zeigt den Amtsblatt-Toggle (default: an)', async () => {
    render(<WasteCalendarPage />);
    await waitFor(() => {
      expect(screen.getByTestId('announcement-toggle')).toBeDefined();
      expect(screen.getByText('Amtsblatt-Termine anzeigen')).toBeDefined();
    });
    // Toggle-Switch innerhalb des Amtsblatt-Toggle-Buttons pruefen
    const toggleBtn = screen.getByTestId('announcement-toggle');
    const switchEl = toggleBtn.querySelector('[role="switch"]');
    expect(switchEl).toBeTruthy();
    expect(switchEl?.getAttribute('aria-checked')).toBe('true');
  });

  it('laedt municipal_announcements vom Supabase', async () => {
    render(<WasteCalendarPage />);
    await waitFor(() => {
      expect(mockFrom).toHaveBeenCalledWith('municipal_announcements');
    });
  });

  it('blendet Amtsblatt-Termine aus wenn Toggle deaktiviert', async () => {
    render(<WasteCalendarPage />);

    // Warte auf Render
    await waitFor(() => {
      expect(screen.getByTestId('announcement-toggle')).toBeDefined();
    });

    // Toggle klicken
    fireEvent.click(screen.getByTestId('announcement-toggle'));

    // Nach Toggle-Klick: aria-checked sollte false sein
    await waitFor(() => {
      const toggleBtn = screen.getByTestId('announcement-toggle');
      const switchEl = toggleBtn.querySelector('[role="switch"]');
      expect(switchEl?.getAttribute('aria-checked')).toBe('false');
    });
  });

  it('rendert Disclaimer-Text', async () => {
    render(<WasteCalendarPage />);
    await waitFor(() => {
      expect(screen.getByText(/ohne Gewähr/)).toBeDefined();
    });
  });

  it('zeigt Monat-Navigation mit Pfeilen', async () => {
    render(<WasteCalendarPage />);
    await waitFor(() => {
      expect(screen.getByLabelText('Vorheriger Monat')).toBeDefined();
      expect(screen.getByLabelText('Nächster Monat')).toBeDefined();
    });
  });

  it('zeigt Wochentag-Header (Mo-So)', async () => {
    render(<WasteCalendarPage />);
    await waitFor(() => {
      expect(screen.getByText('Mo')).toBeDefined();
      expect(screen.getByText('Di')).toBeDefined();
      expect(screen.getByText('So')).toBeDefined();
    });
  });
});
