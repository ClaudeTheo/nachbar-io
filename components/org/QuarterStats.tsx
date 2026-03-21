// components/org/QuarterStats.tsx
// Nachbar.io — Anonymisierte Quartier-Statistiken fuer B2B (Pro Community)
'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Heart, Activity, TriangleAlert, TrendingUp, MessageSquare } from 'lucide-react';

type QuarterSnapshot = {
  snapshot_date: string;
  wah: number;
  total_users: number;
  active_users_7d: number;
  active_users_30d: number;
  posts_count: number;
  events_count: number;
  heartbeat_coverage: number;
  checkin_frequency: number;
  escalation_count: number;
  plus_subscribers: number;
};

type QuarterStatsProps = {
  quarterIds: string[];
};

// Statistik-Karte
function StatCard({
  icon,
  label,
  value,
  unit,
  color,
  description,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  unit?: string;
  color: string;
  description?: string;
}) {
  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        <div className={`p-1.5 rounded-lg ${color}`}>{icon}</div>
        <p className="text-sm text-gray-500">{label}</p>
      </div>
      <p className="text-2xl font-bold text-[#2D3142]">
        {typeof value === 'number' ? value.toLocaleString('de-DE') : value}
        {unit && <span className="text-sm font-normal text-gray-400 ml-1">{unit}</span>}
      </p>
      {description && <p className="mt-1 text-xs text-gray-400">{description}</p>}
    </div>
  );
}

export function QuarterStats({ quarterIds }: QuarterStatsProps) {
  const [snapshots, setSnapshots] = useState<QuarterSnapshot[]>([]);
  const [loading, setLoading] = useState(true);

  const loadStats = useCallback(async () => {
    if (quarterIds.length === 0) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const supabase = createClient();

    // Neueste Snapshots fuer die zugewiesenen Quartiere laden
    const { data } = await supabase
      .from('analytics_snapshots')
      .select('snapshot_date, wah, total_users, active_users_7d, active_users_30d, posts_count, events_count, heartbeat_coverage, checkin_frequency, escalation_count, plus_subscribers')
      .in('quarter_id', quarterIds)
      .order('snapshot_date', { ascending: false })
      .limit(quarterIds.length);

    setSnapshots((data as QuarterSnapshot[]) ?? []);
    setLoading(false);
  }, [quarterIds]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  if (loading) {
    return (
      <div data-testid="quarter-stats-loading" className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  if (snapshots.length === 0) {
    return (
      <Card data-testid="quarter-stats-empty">
        <CardContent className="py-8 text-center">
          <p className="text-sm text-muted-foreground">
            Noch keine Statistiken verfuegbar. Daten werden taeglich erfasst.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Aggregiert ueber alle Quartiere
  const aggregated = snapshots.reduce(
    (acc, s) => ({
      totalUsers: acc.totalUsers + s.total_users,
      activeUsers7d: acc.activeUsers7d + s.active_users_7d,
      wah: acc.wah + s.wah,
      posts: acc.posts + s.posts_count,
      events: acc.events + s.events_count,
      escalations: acc.escalations + s.escalation_count,
      heartbeatCoverage: acc.heartbeatCoverage + s.heartbeat_coverage,
      count: acc.count + 1,
    }),
    { totalUsers: 0, activeUsers7d: 0, wah: 0, posts: 0, events: 0, escalations: 0, heartbeatCoverage: 0, count: 0 }
  );

  const avgHeartbeat = aggregated.count > 0
    ? Math.round(aggregated.heartbeatCoverage / aggregated.count * 10) / 10
    : 0;

  const activityRate = aggregated.totalUsers > 0
    ? Math.round((aggregated.activeUsers7d / aggregated.totalUsers) * 100)
    : 0;

  // Einsamkeits-Proxy: inaktive Nutzer (30d aktiv - 7d aktiv)
  const inactiveUsers = aggregated.totalUsers - aggregated.activeUsers7d;

  return (
    <div className="space-y-4" data-testid="quarter-stats">
      <h2 className="text-base font-semibold text-[#2D3142]">
        Quartier-Statistiken (anonymisiert)
      </h2>

      <div className="grid grid-cols-2 gap-3">
        <StatCard
          icon={<Users className="h-4 w-4 text-white" />}
          label="Bewohner gesamt"
          value={aggregated.totalUsers}
          color="bg-[#2D3142]"
        />
        <StatCard
          icon={<TrendingUp className="h-4 w-4 text-white" />}
          label="Aktive Haushalte"
          value={aggregated.wah}
          unit="/ Woche"
          color="bg-[#4CAF87]"
          description="Woechentlich aktive Haushalte"
        />
        <StatCard
          icon={<Activity className="h-4 w-4 text-white" />}
          label="Aktivitaetsrate"
          value={`${activityRate} %`}
          color="bg-blue-500"
          description="Aktive Nutzer (7 Tage)"
        />
        <StatCard
          icon={<Heart className="h-4 w-4 text-white" />}
          label="Heartbeat-Abdeckung"
          value={`${avgHeartbeat} %`}
          color="bg-rose-500"
          description="Nutzer mit Lebenszeichen in 24h"
        />
        <StatCard
          icon={<MessageSquare className="h-4 w-4 text-white" />}
          label="Beitraege / Woche"
          value={aggregated.posts}
          color="bg-indigo-500"
        />
        <StatCard
          icon={<TriangleAlert className="h-4 w-4 text-white" />}
          label="Offene Eskalationen"
          value={aggregated.escalations}
          color={aggregated.escalations > 0 ? 'bg-[#F59E0B]' : 'bg-gray-400'}
        />
      </div>

      {/* Einsamkeits-Praevention: Inaktive Nutzer */}
      {inactiveUsers > 0 && (
        <Card className="border-[#F59E0B]/30 bg-[#F59E0B]/5">
          <CardContent className="py-4">
            <div className="flex items-center gap-2">
              <TriangleAlert className="h-4 w-4 text-[#F59E0B]" />
              <p className="text-sm font-medium text-[#2D3142]">
                {inactiveUsers} Bewohner ohne Aktivitaet in den letzten 7 Tagen
              </p>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Diese Bewohner koennten von einer aktiven Ansprache profitieren.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
