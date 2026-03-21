// __tests__/app/help/page.test.tsx
// Tests fuer die Hilfe-Boerse inkl. Leihen-Tab

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';

// --- Mocks ---

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('sonner', () => ({
  toast: { error: vi.fn() },
}));

// Supabase Mock — gibt leere Liste zurueck
const mockOrder = vi.fn(() => Promise.resolve({ data: [], error: null }));
const mockGte = vi.fn(() => ({ order: mockOrder }));
const mockEqStatus = vi.fn(() => ({ gte: mockGte }));
const mockEqQuarter = vi.fn(() => ({ eq: mockEqStatus }));
const mockSelect = vi.fn(() => ({ eq: mockEqQuarter }));
const mockFrom = vi.fn(() => ({ select: mockSelect }));

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({ from: mockFrom })),
}));

// useQuarter Mock
vi.mock('@/lib/quarters', () => ({
  useQuarter: () => ({
    currentQuarter: {
      id: 'quarter-bs',
      name: 'Bad Säckingen — Altstadt',
      center_lat: 47.5535,
      center_lng: 7.964,
      city: 'Bad Säckingen',
    },
  }),
}));

// lucide-react Icons als einfache SVG-Elemente
vi.mock('lucide-react', () => ({
  Plus: (props: Record<string, unknown>) => <svg data-testid="icon-plus" {...props} />,
  HandHelping: (props: Record<string, unknown>) => <svg data-testid="icon-hand-helping" {...props} />,
  Search: (props: Record<string, unknown>) => <svg data-testid="icon-search" {...props} />,
  ChevronRight: (props: Record<string, unknown>) => <svg data-testid="icon-chevron-right" {...props} />,
  Filter: (props: Record<string, unknown>) => <svg data-testid="icon-filter" {...props} />,
  Repeat: (props: Record<string, unknown>) => <svg data-testid="icon-repeat" {...props} />,
}));

// shadcn/ui Tabs als einfache Wrapper
vi.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children, defaultValue }: { children: React.ReactNode; defaultValue?: string }) => (
    <div data-testid="tabs" data-default={defaultValue}>{children}</div>
  ),
  TabsList: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tabs-list">{children}</div>
  ),
  TabsTrigger: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <button data-testid={`tab-trigger-${value}`} role="tab">{children}</button>
  ),
  TabsContent: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <div data-testid={`tab-content-${value}`}>{children}</div>
  ),
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: () => <div data-testid="skeleton" />,
}));

import HelpPage from '@/app/(app)/help/page';

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

// ============================================================
// 1. GRUNDLEGENDES RENDERING
// ============================================================

describe('HelpPage — Grundlegendes Rendering', () => {
  it('rendert die Seite ohne Absturz', async () => {
    render(<HelpPage />);
    await waitFor(() => {
      expect(screen.queryByTestId('skeleton')).not.toBeInTheDocument();
    });
    expect(screen.getByText('Hilfe-Börse')).toBeInTheDocument();
  });

  it('zeigt den "Neuer Eintrag"-Button', async () => {
    render(<HelpPage />);
    await waitFor(() => {
      expect(screen.queryByTestId('skeleton')).not.toBeInTheDocument();
    });
    expect(screen.getByTestId('create-help-button')).toBeInTheDocument();
  });

  it('verlinkt "Neuer Eintrag" auf /help/new', async () => {
    render(<HelpPage />);
    await waitFor(() => {
      expect(screen.queryByTestId('skeleton')).not.toBeInTheDocument();
    });
    const btn = screen.getByTestId('create-help-button');
    expect(btn).toHaveAttribute('href', '/help/new');
  });
});

// ============================================================
// 2. TAB-STRUKTUR
// ============================================================

describe('HelpPage — Tab-Struktur', () => {
  it('zeigt den "Sucht Hilfe"-Tab', async () => {
    render(<HelpPage />);
    await waitFor(() => {
      expect(screen.queryByTestId('skeleton')).not.toBeInTheDocument();
    });
    expect(screen.getByTestId('tab-trigger-needs')).toBeInTheDocument();
  });

  it('zeigt den "Bietet Hilfe"-Tab', async () => {
    render(<HelpPage />);
    await waitFor(() => {
      expect(screen.queryByTestId('skeleton')).not.toBeInTheDocument();
    });
    expect(screen.getByTestId('tab-trigger-offers')).toBeInTheDocument();
  });

  it('zeigt den "Leihen"-Tab', async () => {
    render(<HelpPage />);
    await waitFor(() => {
      expect(screen.queryByTestId('skeleton')).not.toBeInTheDocument();
    });
    expect(screen.getByTestId('tab-trigger-lending')).toBeInTheDocument();
  });

  it('enthält den Text "Leihen" im Leihen-Tab-Trigger', async () => {
    render(<HelpPage />);
    await waitFor(() => {
      expect(screen.queryByTestId('skeleton')).not.toBeInTheDocument();
    });
    const lendingTab = screen.getByTestId('tab-trigger-lending');
    expect(lendingTab).toHaveTextContent('Leihen');
  });
});

// ============================================================
// 3. LEIHEN-TAB INHALT
// ============================================================

describe('HelpPage — Leihen-Tab Inhalt', () => {
  it('zeigt den Leihen-TabsContent', async () => {
    render(<HelpPage />);
    await waitFor(() => {
      expect(screen.queryByTestId('skeleton')).not.toBeInTheDocument();
    });
    expect(screen.getByTestId('tab-content-lending')).toBeInTheDocument();
  });

  it('zeigt den "Zur Leihbörse"-Link im Leihen-Tab', async () => {
    render(<HelpPage />);
    await waitFor(() => {
      expect(screen.queryByTestId('skeleton')).not.toBeInTheDocument();
    });
    const link = screen.getByText('Zur Leihbörse');
    expect(link).toBeInTheDocument();
  });

  it('verlinkt "Zur Leihbörse" auf /leihboerse', async () => {
    render(<HelpPage />);
    await waitFor(() => {
      expect(screen.queryByTestId('skeleton')).not.toBeInTheDocument();
    });
    const link = screen.getByText('Zur Leihbörse').closest('a');
    expect(link).toHaveAttribute('href', '/leihboerse');
  });

  it('zeigt den Beschreibungstext im Leihen-Tab', async () => {
    render(<HelpPage />);
    await waitFor(() => {
      expect(screen.queryByTestId('skeleton')).not.toBeInTheDocument();
    });
    expect(screen.getByText('Dinge leihen und verleihen im Quartier')).toBeInTheDocument();
  });

  it('zeigt das Repeat-Icon im Leihen-Tab-Trigger', async () => {
    render(<HelpPage />);
    await waitFor(() => {
      expect(screen.queryByTestId('skeleton')).not.toBeInTheDocument();
    });
    const lendingTab = screen.getByTestId('tab-trigger-lending');
    expect(lendingTab.querySelector('[data-testid="icon-repeat"]')).toBeInTheDocument();
  });
});

// ============================================================
// 4. EMPTY STATES
// ============================================================

describe('HelpPage — Empty States', () => {
  it('zeigt Empty State wenn keine Hilfegesuche vorhanden', async () => {
    render(<HelpPage />);
    await waitFor(() => {
      expect(screen.queryByTestId('skeleton')).not.toBeInTheDocument();
    });
    expect(screen.getByText('Keine aktuellen Hilfegesuche.')).toBeInTheDocument();
  });

  it('zeigt Empty State wenn keine Hilfsangebote vorhanden', async () => {
    render(<HelpPage />);
    await waitFor(() => {
      expect(screen.queryByTestId('skeleton')).not.toBeInTheDocument();
    });
    expect(screen.getByText('Keine aktuellen Hilfsangebote.')).toBeInTheDocument();
  });
});
