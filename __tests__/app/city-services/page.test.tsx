// __tests__/app/city-services/page.test.tsx
// Gruendliche Tests fuer die Rathaus & Infos Seite

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';

// --- Mocks ---

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

// Supabase Mock — konfigurierbar pro Test
// Zwei getrennte Chains: municipal_config (.single()) und municipal_announcements (.order())

const mockConfigData: { data: unknown; error: unknown } = { data: null, error: null };
const mockAnnouncementsData: { data: unknown[] | null; error: unknown } = { data: [], error: null };

// Config-Chain: select → eq → single → then
const mockConfigSingle = vi.fn(() => ({
  then: vi.fn((cb: (result: { data: unknown; error: unknown }) => void) => {
    cb(mockConfigData);
    return { catch: vi.fn() };
  }),
}));
const mockConfigEq = vi.fn(() => ({ single: mockConfigSingle }));
const mockConfigSelect = vi.fn(() => ({ eq: mockConfigEq }));

// Announcements-Chain: select → eq → lte → order → order → then
const mockAnnouncementsThen = vi.fn((cb: (result: { data: unknown[] | null; error: unknown }) => void) => {
  cb(mockAnnouncementsData);
  return { catch: vi.fn() };
});
const mockAnnouncementsOrder2 = vi.fn(() => ({ then: mockAnnouncementsThen }));
const mockAnnouncementsOrder1 = vi.fn(() => ({ order: mockAnnouncementsOrder2 }));
const mockAnnouncementsLte = vi.fn(() => ({ order: mockAnnouncementsOrder1 }));
const mockAnnouncementsEq = vi.fn(() => ({ lte: mockAnnouncementsLte }));
const mockAnnouncementsSelect = vi.fn(() => ({ eq: mockAnnouncementsEq }));

const mockFrom = vi.fn((table: string) => {
  if (table === 'municipal_config') return { select: mockConfigSelect };
  if (table === 'municipal_announcements') return { select: mockAnnouncementsSelect };
  return { select: mockAnnouncementsSelect };
});

function setupSupabaseChain(announcements: unknown[] | null = [], config: unknown = null) {
  mockAnnouncementsData.data = announcements;
  mockAnnouncementsData.error = null;
  mockConfigData.data = config;
  mockConfigData.error = null;
}

// Standard-Config fuer Bad Saeckingen
const DEFAULT_CONFIG = {
  id: 'config-1',
  quarter_id: 'quarter-bs',
  city_name: 'Bad Säckingen',
  state: 'Baden-Württemberg',
  rathaus_url: 'https://www.bad-saeckingen.de',
  rathaus_phone: '07761 51-0',
  rathaus_email: 'info@bad-saeckingen.de',
  opening_hours: {
    mo: '8:00–12:00, 14:00–16:00',
    di: '8:00–12:00',
    mi: '8:00–12:00',
    do: '8:00–12:00, 14:00–18:00',
    fr: '8:00–12:00',
  },
  features: { reports: true, waste_calendar: true, announcements: true },
  service_links: [
    { label: 'Rathaus Bad Säckingen', url: 'https://www.bad-saeckingen.de', icon: 'building', category: 'kontakt' },
    { label: 'Bürgerbüro', url: 'https://www.bad-saeckingen.de/buergerbuero', icon: 'users', category: 'kontakt' },
    { label: 'Fundbüro', url: 'https://www.bad-saeckingen.de/fundbuero', icon: 'search', category: 'service' },
    { label: 'Formulare & Anträge', url: 'https://www.bad-saeckingen.de/formulare', icon: 'clipboard', category: 'formulare' },
    { label: 'Polizei Bad Säckingen', url: 'https://www.polizei-bw.de', icon: 'shield', category: 'notfall' },
    { label: 'Stadtwerke Bad Säckingen', url: 'https://www.stadtwerke-bad-saeckingen.de', icon: 'zap', category: 'versorgung' },
  ],
  wiki_entries: [
    { question: 'Wo melde ich ein Schlagloch?', answer: 'Beim Bauhof der Stadt.', category: 'infrastruktur', links: [{ label: 'Rathaus', url: 'https://www.bad-saeckingen.de' }] },
    { question: 'Wann wird mein Müll abgeholt?', answer: 'Siehe Müllkalender.', category: 'entsorgung', links: [] },
    { question: 'Wie melde ich meinen Wohnsitz an?', answer: 'Im Bürgerbüro.', category: 'verwaltung', links: [] },
    { question: 'Wo melde ich Ruhestörung?', answer: 'Bei der Polizei.', category: 'ordnung', links: [] },
  ],
  created_at: '2026-03-19T00:00:00Z',
  updated_at: '2026-03-19T00:00:00Z',
};

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    from: mockFrom,
  })),
}));

// useQuarter Mock
const mockCurrentQuarter = {
  id: 'quarter-bs',
  name: 'Bad Säckingen — Altstadt',
  center_lat: 47.5535,
  center_lng: 7.964,
};

vi.mock('@/lib/quarters', () => ({
  useQuarter: () => ({
    currentQuarter: mockCurrentQuarter,
  }),
}));

// lucide-react Icons als einfache Elemente
vi.mock('lucide-react', () => ({
  ArrowLeft: (props: Record<string, unknown>) => <svg data-testid="icon-arrow-left" {...props} />,
  Search: (props: Record<string, unknown>) => <svg data-testid="icon-search" {...props} />,
  Pin: (props: Record<string, unknown>) => <svg data-testid="icon-pin" {...props} />,
  ExternalLink: (props: Record<string, unknown>) => <svg data-testid="icon-external-link" {...props} />,
}));

import CityServicesPage from '@/app/(app)/city-services/page';
import { DISCLAIMERS, SERVICE_LINK_CATEGORIES, WIKI_CATEGORIES } from '@/lib/municipal';

beforeEach(() => {
  vi.clearAllMocks();
  setupSupabaseChain([], DEFAULT_CONFIG);
});

afterEach(() => {
  cleanup();
});

// ============================================================
// 1. GRUNDLEGENDES RENDERING
// ============================================================

describe('CityServicesPage — Grundlegendes Rendering', () => {
  it('rendert den Seitentitel "Rathaus & Infos"', () => {
    render(<CityServicesPage />);
    expect(screen.getByText('Rathaus & Infos')).toBeDefined();
  });

  it('rendert den Zurueck-Link zum Dashboard', () => {
    render(<CityServicesPage />);
    const links = screen.getAllByRole('link');
    const dashboardLink = links.find((l) => l.getAttribute('href') === '/dashboard');
    expect(dashboardLink).toBeDefined();
  });

  it('rendert das Zurueck-Pfeil-Icon', () => {
    render(<CityServicesPage />);
    expect(screen.getByTestId('icon-arrow-left')).toBeDefined();
  });

  it('rendert drei Tabs', () => {
    render(<CityServicesPage />);
    // "Services" existiert sowohl als Tab als auch als Kategorie-Label
    const serviceElements = screen.getAllByText('Services');
    expect(serviceElements.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Hilfe / Wiki')).toBeDefined();
    expect(screen.getByText('Bekanntmachungen')).toBeDefined();
  });

  it('zeigt Services-Tab als Standard aktiv', () => {
    render(<CityServicesPage />);
    // Services-Tab ist der erste Button mit "Services"-Text
    const serviceElements = screen.getAllByText('Services');
    const servicesTab = serviceElements.find((el) => el.tagName === 'BUTTON');
    expect(servicesTab?.className).toContain('bg-white');
  });
});

// ============================================================
// 2. SERVICES-TAB (Standard)
// ============================================================

describe('CityServicesPage — Services-Tab', () => {
  it('zeigt Rathaus-Ueberschrift mit Stadtname aus DB', async () => {
    render(<CityServicesPage />);
    await waitFor(() => {
      // Heading ist "Rathaus {cityName}" — kann gesplittet gerendert werden
      const heading = screen.getByRole('heading', { level: 2 });
      expect(heading.textContent).toContain('Rathaus');
      expect(heading.textContent).toContain('Bad Säckingen');
    });
  });

  it('zeigt Telefonnummer als klickbaren Link', async () => {
    render(<CityServicesPage />);
    await waitFor(() => {
      const phoneLink = screen.getByText('07761 51-0');
      expect(phoneLink.closest('a')?.getAttribute('href')).toBe('tel:0776151-0');
    });
  });

  it('zeigt E-Mail-Adresse als klickbaren Link', async () => {
    render(<CityServicesPage />);
    await waitFor(() => {
      const emailLink = screen.getByText('info@bad-saeckingen.de');
      expect(emailLink.closest('a')?.getAttribute('href')).toBe('mailto:info@bad-saeckingen.de');
    });
  });

  it('zeigt Oeffnungszeiten aus DB-Config', async () => {
    render(<CityServicesPage />);
    await waitFor(() => {
      expect(screen.getByText(/8:00–12:00, 14:00–16:00/)).toBeDefined();
    });
  });

  it('zeigt Website-Link wenn rathaus_url vorhanden', async () => {
    render(<CityServicesPage />);
    await waitFor(() => {
      const websiteLink = screen.getByText('Website');
      expect(websiteLink.closest('a')?.getAttribute('href')).toBe('https://www.bad-saeckingen.de');
    });
  });

  it('zeigt alle Service-Link-Kategorien', async () => {
    render(<CityServicesPage />);
    await waitFor(() => {
      for (const cat of SERVICE_LINK_CATEGORIES) {
        const elements = screen.getAllByText(cat.label);
        expect(elements.length).toBeGreaterThanOrEqual(1);
      }
    });
  });

  it('zeigt Service-Links aus DB', async () => {
    render(<CityServicesPage />);
    await waitFor(() => {
      expect(screen.getByText('Bürgerbüro')).toBeDefined();
      expect(screen.getByText('Fundbüro')).toBeDefined();
      expect(screen.getByText('Polizei Bad Säckingen')).toBeDefined();
    });
  });
});

// ============================================================
// 3. TAB-WECHSEL
// ============================================================

describe('CityServicesPage — Tab-Wechsel', () => {
  it('wechselt zum Wiki-Tab bei Klick', () => {
    render(<CityServicesPage />);
    fireEvent.click(screen.getByText('Hilfe / Wiki'));
    // Wiki-Tab zeigt Suchfeld
    expect(screen.getByPlaceholderText('Suche: z.B. Schlagloch, Müll, Parkausweis...')).toBeDefined();
  });

  it('wechselt zum Bekanntmachungen-Tab bei Klick', () => {
    render(<CityServicesPage />);
    fireEvent.click(screen.getByText('Bekanntmachungen'));
    // Sollte Leerzustand zeigen (keine Bekanntmachungen)
    expect(screen.getByText('Keine Bekanntmachungen')).toBeDefined();
  });

  it('wechselt zurueck zum Services-Tab', async () => {
    render(<CityServicesPage />);
    // Zu Wiki wechseln
    fireEvent.click(screen.getByText('Hilfe / Wiki'));
    // Zurueck zu Services
    fireEvent.click(screen.getAllByText('Services').find(el => el.tagName === 'BUTTON')!);
    await waitFor(() => {
      const heading = screen.getByRole('heading', { level: 2 });
      expect(heading.textContent).toContain('Rathaus');
    });
  });

  it('aktualisiert aktiven Tab-Stil bei Wechsel', () => {
    render(<CityServicesPage />);
    const wikiTab = screen.getByText('Hilfe / Wiki');
    // Vorher: Wiki nicht aktiv
    expect(wikiTab.className).not.toContain('bg-white');
    // Klick auf Wiki
    fireEvent.click(wikiTab);
    // Nachher: Wiki aktiv
    expect(wikiTab.className).toContain('bg-white');
  });
});

// ============================================================
// 4. WIKI-TAB
// ============================================================

describe('CityServicesPage — Wiki-Tab', () => {
  function renderWikiTab() {
    render(<CityServicesPage />);
    fireEvent.click(screen.getByText('Hilfe / Wiki'));
  }

  it('zeigt Suchfeld', () => {
    renderWikiTab();
    expect(screen.getByPlaceholderText('Suche: z.B. Schlagloch, Müll, Parkausweis...')).toBeDefined();
  });

  it('zeigt Such-Icon', () => {
    renderWikiTab();
    expect(screen.getByTestId('icon-search')).toBeDefined();
  });

  it('zeigt Wiki-Kategorien mit Eintraegen', async () => {
    renderWikiTab();
    await waitFor(() => {
      // Kategorien werden als Ueberschriften gezeigt wenn Eintraege vorhanden
      expect(screen.getByText('Infrastruktur')).toBeDefined();
      expect(screen.getByText('Entsorgung & Müll')).toBeDefined();
    });
  });

  it('zeigt Wiki-Fragen als Details-Elemente', async () => {
    renderWikiTab();
    await waitFor(() => {
      expect(screen.getByText('Wo melde ich ein Schlagloch?')).toBeDefined();
      expect(screen.getByText('Wann wird mein Müll abgeholt?')).toBeDefined();
    });
  });

  it('Suchfeld ist editierbar', () => {
    renderWikiTab();
    const input = screen.getByPlaceholderText('Suche: z.B. Schlagloch, Müll, Parkausweis...') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Müll' } });
    expect(input.value).toBe('Müll');
  });
});

// ============================================================
// 5. BEKANNTMACHUNGEN-TAB — LEERZUSTAND
// ============================================================

describe('CityServicesPage — Bekanntmachungen Leerzustand', () => {
  function renderAnnouncementsTab() {
    render(<CityServicesPage />);
    fireEvent.click(screen.getByText('Bekanntmachungen'));
  }

  it('zeigt "Keine Bekanntmachungen" Ueberschrift', () => {
    renderAnnouncementsTab();
    expect(screen.getByText('Keine Bekanntmachungen')).toBeDefined();
  });

  it('zeigt Erklaerungstext im Leerzustand', () => {
    renderAnnouncementsTab();
    expect(screen.getByText('Aktuelle Bekanntmachungen für Ihr Quartier erscheinen hier.')).toBeDefined();
  });

  it('zeigt Megafon-Emoji', () => {
    renderAnnouncementsTab();
    expect(screen.getByText('📢')).toBeDefined();
  });

  it('zeigt Disclaimer-Text', () => {
    renderAnnouncementsTab();
    expect(screen.getByText(DISCLAIMERS.announcements)).toBeDefined();
  });
});

// ============================================================
// 6. BEKANNTMACHUNGEN-TAB — MIT DATEN
// ============================================================

describe('CityServicesPage — Bekanntmachungen mit Daten', () => {
  const mockAnnouncements = [
    {
      id: 'ann-1',
      quarter_id: 'quarter-bs',
      author_id: 'admin-1',
      title: 'Straßensperrung Hauptstraße',
      body: 'Die Hauptstraße wird vom 1.4. bis 15.4. gesperrt.',
      source_url: 'https://bad-saeckingen.de/sperrung',
      category: 'verkehr' as const,
      pinned: true,
      published_at: '2026-03-18T10:00:00Z',
      expires_at: null,
      created_at: '2026-03-18T10:00:00Z',
      updated_at: '2026-03-18T10:00:00Z',
    },
    {
      id: 'ann-2',
      quarter_id: 'quarter-bs',
      author_id: 'admin-1',
      title: 'Frühlingsfest am Münsterplatz',
      body: 'Am 5. April findet das traditionelle Frühlingsfest statt.',
      source_url: null,
      category: 'veranstaltung' as const,
      pinned: false,
      published_at: '2026-03-17T08:00:00Z',
      expires_at: '2026-05-01T00:00:00Z',
      created_at: '2026-03-17T08:00:00Z',
      updated_at: '2026-03-17T08:00:00Z',
    },
  ];

  function renderAnnouncementsWithData() {
    setupSupabaseChain(mockAnnouncements, DEFAULT_CONFIG);
    render(<CityServicesPage />);
    fireEvent.click(screen.getByText('Bekanntmachungen'));
  }

  it('zeigt Bekanntmachungs-Titel', async () => {
    renderAnnouncementsWithData();
    await waitFor(() => {
      expect(screen.getByText('Straßensperrung Hauptstraße')).toBeDefined();
    });
  });

  it('zeigt zweite Bekanntmachung', async () => {
    renderAnnouncementsWithData();
    await waitFor(() => {
      expect(screen.getByText('Frühlingsfest am Münsterplatz')).toBeDefined();
    });
  });

  it('zeigt Body-Text der Bekanntmachung', async () => {
    renderAnnouncementsWithData();
    await waitFor(() => {
      expect(screen.getByText('Die Hauptstraße wird vom 1.4. bis 15.4. gesperrt.')).toBeDefined();
    });
  });

  it('zeigt "Angepinnt" Badge fuer gepinnte Bekanntmachung', async () => {
    renderAnnouncementsWithData();
    await waitFor(() => {
      expect(screen.getByText('Angepinnt')).toBeDefined();
    });
  });

  it('zeigt Kategorie-Badge "Verkehr"', async () => {
    renderAnnouncementsWithData();
    await waitFor(() => {
      // Badge enthaelt Icon + Label: "🚗 Verkehr"
      expect(screen.getByText(/Verkehr/)).toBeDefined();
    });
  });

  it('zeigt Kategorie-Badge "Veranstaltung"', async () => {
    renderAnnouncementsWithData();
    await waitFor(() => {
      // Badge enthaelt Icon + Label: "🎭 Veranstaltung"
      expect(screen.getByText(/Veranstaltung/)).toBeDefined();
    });
  });

  it('zeigt Datum im deutschen Format', async () => {
    renderAnnouncementsWithData();
    await waitFor(() => {
      expect(screen.getByText('18.03.2026')).toBeDefined();
    });
  });

  it('zeigt Quell-Link wenn vorhanden', async () => {
    renderAnnouncementsWithData();
    await waitFor(() => {
      const link = screen.getByText('Quelle');
      expect(link.closest('a')?.getAttribute('href')).toBe('https://bad-saeckingen.de/sperrung');
    });
  });

  it('Quell-Link oeffnet in neuem Tab', async () => {
    renderAnnouncementsWithData();
    await waitFor(() => {
      const link = screen.getByText('Quelle').closest('a');
      expect(link?.getAttribute('target')).toBe('_blank');
      expect(link?.getAttribute('rel')).toContain('noopener');
    });
  });

  it('zeigt keinen Quell-Link wenn source_url null', async () => {
    renderAnnouncementsWithData();
    await waitFor(() => {
      // Nur ein Quell-Link (ann-1 hat source_url, ann-2 nicht)
      const links = screen.getAllByText('Quelle');
      expect(links).toHaveLength(1);
    });
  });

  it('zeigt Disclaimer auch bei vorhandenen Daten', async () => {
    renderAnnouncementsWithData();
    await waitFor(() => {
      expect(screen.getByText(DISCLAIMERS.announcements)).toBeDefined();
    });
  });
});

// ============================================================
// 7. BEKANNTMACHUNGEN — ABGELAUFENE FILTERN
// ============================================================

describe('CityServicesPage — Abgelaufene Bekanntmachungen', () => {
  it('filtert abgelaufene Bekanntmachungen client-seitig', async () => {
    const pastDate = '2020-01-01T00:00:00Z';
    const futureDate = '2030-12-31T00:00:00Z';
    const announcements = [
      {
        id: 'ann-active',
        quarter_id: 'quarter-bs',
        author_id: 'admin-1',
        title: 'Aktive Meldung',
        body: 'Noch gültig.',
        source_url: null,
        category: 'sonstiges' as const,
        pinned: false,
        published_at: '2026-03-01T00:00:00Z',
        expires_at: futureDate,
        created_at: '2026-03-01T00:00:00Z',
        updated_at: '2026-03-01T00:00:00Z',
      },
      {
        id: 'ann-expired',
        quarter_id: 'quarter-bs',
        author_id: 'admin-1',
        title: 'Abgelaufene Meldung',
        body: 'Nicht mehr gültig.',
        source_url: null,
        category: 'sonstiges' as const,
        pinned: false,
        published_at: '2026-01-01T00:00:00Z',
        expires_at: pastDate,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      },
    ];

    setupSupabaseChain(announcements, DEFAULT_CONFIG);
    render(<CityServicesPage />);
    fireEvent.click(screen.getByText('Bekanntmachungen'));

    await waitFor(() => {
      expect(screen.getByText('Aktive Meldung')).toBeDefined();
      expect(screen.queryByText('Abgelaufene Meldung')).toBeNull();
    });
  });

  it('zeigt Bekanntmachungen ohne expires_at (unbefristet)', async () => {
    const announcements = [
      {
        id: 'ann-no-expiry',
        quarter_id: 'quarter-bs',
        author_id: 'admin-1',
        title: 'Unbefristete Meldung',
        body: 'Gilt bis auf Weiteres.',
        source_url: null,
        category: 'verwaltung' as const,
        pinned: false,
        published_at: '2026-03-01T00:00:00Z',
        expires_at: null,
        created_at: '2026-03-01T00:00:00Z',
        updated_at: '2026-03-01T00:00:00Z',
      },
    ];

    setupSupabaseChain(announcements, DEFAULT_CONFIG);
    render(<CityServicesPage />);
    fireEvent.click(screen.getByText('Bekanntmachungen'));

    await waitFor(() => {
      expect(screen.getByText('Unbefristete Meldung')).toBeDefined();
    });
  });
});

// ============================================================
// 8. SUPABASE-ABFRAGE
// ============================================================

describe('CityServicesPage — Supabase-Abfrage', () => {
  it('fragt municipal_config beim Laden ab', () => {
    render(<CityServicesPage />);
    expect(mockFrom).toHaveBeenCalledWith('municipal_config');
  });

  it('fragt municipal_announcements beim Tab-Wechsel ab', () => {
    render(<CityServicesPage />);
    fireEvent.click(screen.getByText('Bekanntmachungen'));
    expect(mockFrom).toHaveBeenCalledWith('municipal_announcements');
  });

  it('filtert Announcements nach quarter_id', () => {
    render(<CityServicesPage />);
    fireEvent.click(screen.getByText('Bekanntmachungen'));
    expect(mockAnnouncementsEq).toHaveBeenCalledWith('quarter_id', 'quarter-bs');
  });

  it('filtert nach published_at <= jetzt', () => {
    render(<CityServicesPage />);
    fireEvent.click(screen.getByText('Bekanntmachungen'));
    expect(mockAnnouncementsLte).toHaveBeenCalledWith('published_at', expect.any(String));
  });

  it('sortiert zuerst nach pinned (absteigend)', () => {
    render(<CityServicesPage />);
    fireEvent.click(screen.getByText('Bekanntmachungen'));
    expect(mockAnnouncementsOrder1).toHaveBeenCalledWith('pinned', { ascending: false });
  });

  it('sortiert danach nach published_at (absteigend)', () => {
    render(<CityServicesPage />);
    fireEvent.click(screen.getByText('Bekanntmachungen'));
    expect(mockAnnouncementsOrder2).toHaveBeenCalledWith('published_at', { ascending: false });
  });

  it('fragt Config mit .single() ab', () => {
    render(<CityServicesPage />);
    expect(mockConfigSingle).toHaveBeenCalled();
  });
});

// ============================================================
// 9. EDGE CASES
// ============================================================

describe('CityServicesPage — Edge Cases', () => {
  it('behandelt null-Daten von Supabase', async () => {
    setupSupabaseChain(null, null);
    render(<CityServicesPage />);
    fireEvent.click(screen.getByText('Bekanntmachungen'));

    await waitFor(() => {
      expect(screen.getByText('Keine Bekanntmachungen')).toBeDefined();
    });
  });

  it('rendert Bekanntmachung ohne body', async () => {
    const announcements = [
      {
        id: 'ann-no-body',
        quarter_id: 'quarter-bs',
        author_id: 'admin-1',
        title: 'Nur Titel',
        body: null,
        source_url: null,
        category: 'warnung' as const,
        pinned: false,
        published_at: '2026-03-18T10:00:00Z',
        expires_at: null,
        created_at: '2026-03-18T10:00:00Z',
        updated_at: '2026-03-18T10:00:00Z',
      },
    ];

    setupSupabaseChain(announcements, DEFAULT_CONFIG);
    render(<CityServicesPage />);
    fireEvent.click(screen.getByText('Bekanntmachungen'));

    await waitFor(() => {
      expect(screen.getByText('Nur Titel')).toBeDefined();
      // Kein Body-Absatz gerendert
      expect(screen.queryByText('null')).toBeNull();
    });
  });

  it('getCategoryConfig gibt Fallback fuer unbekannte Kategorie', async () => {
    const announcements = [
      {
        id: 'ann-unknown-cat',
        quarter_id: 'quarter-bs',
        author_id: 'admin-1',
        title: 'Unbekannte Kategorie',
        body: 'Test',
        source_url: null,
        category: 'unbekannt' as const,
        pinned: false,
        published_at: '2026-03-18T10:00:00Z',
        expires_at: null,
        created_at: '2026-03-18T10:00:00Z',
        updated_at: '2026-03-18T10:00:00Z',
      },
    ];

    setupSupabaseChain(announcements, DEFAULT_CONFIG);
    render(<CityServicesPage />);
    fireEvent.click(screen.getByText('Bekanntmachungen'));

    await waitFor(() => {
      // Fallback auf sonstiges (Index 5) — Badge zeigt "📢 Sonstiges"
      expect(screen.getByText('Unbekannte Kategorie')).toBeDefined();
      expect(screen.getByText(/Sonstiges/)).toBeDefined();
    });
  });

  it('Suchfeld im Wiki-Tab hat korrekte Styling-Klassen', () => {
    render(<CityServicesPage />);
    fireEvent.click(screen.getByText('Hilfe / Wiki'));
    const input = screen.getByPlaceholderText('Suche: z.B. Schlagloch, Müll, Parkausweis...');
    expect(input.className).toContain('rounded-lg');
    expect(input.className).toContain('text-sm');
  });
});

// ============================================================
// 10. ACCESSIBILITY
// ============================================================

describe('CityServicesPage — Barrierefreiheit', () => {
  it('Zurueck-Link ist klickbar (kein toter Link)', () => {
    render(<CityServicesPage />);
    const links = screen.getAllByRole('link');
    const dashboardLink = links.find((l) => l.getAttribute('href') === '/dashboard');
    expect(dashboardLink).toBeDefined();
  });

  it('Tabs sind als Buttons gerendert', () => {
    render(<CityServicesPage />);
    const buttons = screen.getAllByRole('button');
    // Mindestens 3 Tab-Buttons
    expect(buttons.length).toBeGreaterThanOrEqual(3);
  });

  it('Suchfeld hat Placeholder-Text als Hilfe', () => {
    render(<CityServicesPage />);
    fireEvent.click(screen.getByText('Hilfe / Wiki'));
    const input = screen.getByPlaceholderText('Suche: z.B. Schlagloch, Müll, Parkausweis...');
    expect(input.tagName.toLowerCase()).toBe('input');
    expect(input.getAttribute('type')).toBe('text');
  });

  it('Externe Links haben rel="noopener noreferrer"', async () => {
    const announcements = [
      {
        id: 'ann-link',
        quarter_id: 'quarter-bs',
        author_id: 'admin-1',
        title: 'Mit Link',
        body: 'Text',
        source_url: 'https://example.com',
        category: 'sonstiges' as const,
        pinned: false,
        published_at: '2026-03-18T10:00:00Z',
        expires_at: null,
        created_at: '2026-03-18T10:00:00Z',
        updated_at: '2026-03-18T10:00:00Z',
      },
    ];

    setupSupabaseChain(announcements, DEFAULT_CONFIG);
    render(<CityServicesPage />);
    fireEvent.click(screen.getByText('Bekanntmachungen'));

    await waitFor(() => {
      const link = screen.getByText('Quelle').closest('a');
      expect(link?.getAttribute('rel')).toContain('noopener');
      expect(link?.getAttribute('rel')).toContain('noreferrer');
    });
  });

  it('Emoji-Element hat aria-hidden', async () => {
    render(<CityServicesPage />);
    fireEvent.click(screen.getByText('Bekanntmachungen'));

    await waitFor(() => {
      const emoji = screen.getByText('📢');
      expect(emoji.getAttribute('aria-hidden')).toBe('true');
    });
  });
});

// ============================================================
// 11. DISCLAIMER-INTEGRATION
// ============================================================

describe('CityServicesPage — Disclaimers', () => {
  it('Bekanntmachungen-Disclaimer verweist auf Amtsblatt', () => {
    render(<CityServicesPage />);
    fireEvent.click(screen.getByText('Bekanntmachungen'));
    const disclaimer = screen.getByText(DISCLAIMERS.announcements);
    expect(disclaimer).toBeDefined();
    expect(disclaimer.className).toContain('text-[10px]');
  });

  it('Disclaimer ist zentriert', () => {
    render(<CityServicesPage />);
    fireEvent.click(screen.getByText('Bekanntmachungen'));
    const disclaimer = screen.getByText(DISCLAIMERS.announcements);
    expect(disclaimer.className).toContain('text-center');
  });
});
