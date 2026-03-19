import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { KpiMetricCard } from '@/components/admin/KpiMetricCard';
import { KpiTrendChart } from '@/components/admin/KpiTrendChart';
import { KpiDashboard } from '@/components/admin/KpiDashboard';

afterEach(cleanup);

// Steuerbarer Mock fuer Supabase-Query
const mockQueryFn = vi.fn();

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({
        order: () => ({
          limit: () => mockQueryFn(),
        }),
      }),
    }),
  }),
}));

// Mock recharts (rendert nicht im jsdom)
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="chart-container">{children}</div>,
  LineChart: ({ children }: { children: React.ReactNode }) => <div data-testid="line-chart">{children}</div>,
  Line: () => <div data-testid="line" />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  CartesianGrid: () => <div />,
  Tooltip: () => <div />,
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockQueryFn.mockResolvedValue({ data: [] });
});

// --- KpiMetricCard ---

describe('KpiMetricCard', () => {
  it('zeigt Wert und Titel an', () => {
    render(<KpiMetricCard title="Nutzer gesamt" value={42} />);
    expect(screen.getByText('Nutzer gesamt')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('zeigt positiven Trend-Pfeil', () => {
    const { container } = render(<KpiMetricCard title="WAH" value={50} previousValue={40} />);
    // Pfeil nach oben, gruen
    const trendEl = container.querySelector('.text-green-600');
    expect(trendEl).toBeInTheDocument();
    expect(trendEl?.textContent).toContain('25.0');
  });

  it('zeigt negativen Trend-Pfeil', () => {
    const { container } = render(<KpiMetricCard title="Retention" value={60} previousValue={80} />);
    // Pfeil nach unten, rot
    const trendEl = container.querySelector('.text-red-500');
    expect(trendEl).toBeInTheDocument();
    expect(trendEl?.textContent).toContain('25.0');
  });

  it('zeigt Prozent-Format', () => {
    render(<KpiMetricCard title="Aktivierung" value={75.5} format="percent" />);
    expect(screen.getByText('75.5 %')).toBeInTheDocument();
  });

  it('zeigt Waehrungs-Format', () => {
    render(<KpiMetricCard title="MRR" value={89.50} format="currency" />);
    expect(screen.getByText('€ 89.50')).toBeInTheDocument();
  });

  it('zeigt Beschreibung', () => {
    render(<KpiMetricCard title="Test" value={1} description="Testbeschreibung" />);
    expect(screen.getByText('Testbeschreibung')).toBeInTheDocument();
  });
});

// --- KpiTrendChart ---

describe('KpiTrendChart', () => {
  it('zeigt Leer-Nachricht ohne Daten', () => {
    render(<KpiTrendChart title="WAH-Verlauf" data={[]} />);
    expect(screen.getByText('Noch keine Daten vorhanden')).toBeInTheDocument();
  });

  it('rendert Chart-Container mit Daten', () => {
    const data = [
      { date: '2026-03-01', value: 10 },
      { date: '2026-03-02', value: 15 },
    ];
    render(<KpiTrendChart title="Trend-Test" data={data} />);
    expect(screen.getByTestId('chart-container')).toBeInTheDocument();
    expect(screen.getByText('Trend-Test')).toBeInTheDocument();
  });
});

// --- KpiDashboard ---

describe('KpiDashboard', () => {
  it('zeigt Hinweis ohne Snapshots', async () => {
    mockQueryFn.mockResolvedValue({ data: [] });
    render(<KpiDashboard />);
    await waitFor(() => {
      expect(screen.getByText(/Noch keine Analytics-Daten/)).toBeInTheDocument();
    });
  });

  it('zeigt KPI-Cards mit Daten', async () => {
    mockQueryFn.mockResolvedValue({
      data: [{
        snapshot_date: '2026-03-18',
        wah: 20, total_users: 45, active_users_7d: 30, active_users_30d: 40,
        new_registrations: 5, activation_rate: 66.7, retention_7d: 80.0, retention_30d: 60.0,
        invite_sent: 12, invite_converted: 8, invite_conversion_rate: 66.7,
        posts_count: 15, events_count: 3, rsvp_count: 22,
        plus_subscribers: 4, heartbeat_coverage: 75.0, checkin_frequency: 2.5,
        escalation_count: 1, active_orgs: 2, mrr: 158.00,
      }],
    });

    render(<KpiDashboard />);

    await waitFor(() => {
      expect(screen.getByTestId('kpi-dashboard')).toBeInTheDocument();
    });

    expect(screen.getByText('WAH — Woechentlich aktive Haushalte')).toBeInTheDocument();
    expect(screen.getByText('20')).toBeInTheDocument();
    expect(screen.getByText('Nutzer gesamt')).toBeInTheDocument();
  });

  it('zeigt Trend-Charts mit mehreren Snapshots', async () => {
    mockQueryFn.mockResolvedValue({
      data: [
        {
          snapshot_date: '2026-03-17',
          wah: 18, total_users: 40, active_users_7d: 25, active_users_30d: 35,
          new_registrations: 3, activation_rate: 60.0, retention_7d: 75.0, retention_30d: 55.0,
          invite_sent: 10, invite_converted: 6, invite_conversion_rate: 60.0,
          posts_count: 12, events_count: 2, rsvp_count: 18,
          plus_subscribers: 3, heartbeat_coverage: 70.0, checkin_frequency: 2.0,
          escalation_count: 2, active_orgs: 1, mrr: 79.00,
        },
        {
          snapshot_date: '2026-03-18',
          wah: 22, total_users: 48, active_users_7d: 32, active_users_30d: 42,
          new_registrations: 8, activation_rate: 68.0, retention_7d: 82.0, retention_30d: 62.0,
          invite_sent: 15, invite_converted: 10, invite_conversion_rate: 66.7,
          posts_count: 18, events_count: 4, rsvp_count: 25,
          plus_subscribers: 5, heartbeat_coverage: 78.0, checkin_frequency: 3.0,
          escalation_count: 0, active_orgs: 2, mrr: 166.80,
        },
      ],
    });

    render(<KpiDashboard />);

    await waitFor(() => {
      expect(screen.getByTestId('kpi-dashboard')).toBeInTheDocument();
    });

    expect(screen.getByText('WAH-Verlauf (30 Tage)')).toBeInTheDocument();
    expect(screen.getByText('Aktive Nutzer (7 Tage)')).toBeInTheDocument();
  });
});
