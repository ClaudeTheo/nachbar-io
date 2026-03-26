"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { KpiMetricCard } from "./KpiMetricCard";
import { KpiTrendChart, type TrendDataPoint } from "./KpiTrendChart";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

type SnapshotRow = {
  snapshot_date: string;
  wah: number;
  total_users: number;
  active_users_7d: number;
  active_users_30d: number;
  new_registrations: number;
  activation_rate: number;
  retention_7d: number;
  retention_30d: number;
  invite_sent: number;
  invite_converted: number;
  invite_conversion_rate: number;
  posts_count: number;
  events_count: number;
  rsvp_count: number;
  plus_subscribers: number;
  heartbeat_coverage: number;
  checkin_frequency: number;
  escalation_count: number;
  active_orgs: number;
  mrr: number;
};

export function KpiDashboard() {
  const [snapshots, setSnapshots] = useState<SnapshotRow[]>([]);
  const [loading, setLoading] = useState(true);

  const loadSnapshots = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("analytics_snapshots")
      .select("*")
      .order("snapshot_date", { ascending: true })
      .limit(30);
    setSnapshots((data as SnapshotRow[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadSnapshots();
  }, [loadSnapshots]);

  if (loading) {
    return (
      <div className="space-y-4" data-testid="kpi-loading">
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-52" />
      </div>
    );
  }

  const latest = snapshots[snapshots.length - 1];
  const previous =
    snapshots.length > 1 ? snapshots[snapshots.length - 2] : undefined;

  // Trend-Daten fuer Charts
  const wahTrend: TrendDataPoint[] = snapshots.map((s) => ({
    date: s.snapshot_date,
    value: s.wah,
  }));

  const userTrend: TrendDataPoint[] = snapshots.map((s) => ({
    date: s.snapshot_date,
    value: s.active_users_7d,
  }));

  const postsTrend: TrendDataPoint[] = snapshots.map((s) => ({
    date: s.snapshot_date,
    value: s.posts_count,
  }));

  const heartbeatTrend: TrendDataPoint[] = snapshots.map((s) => ({
    date: s.snapshot_date,
    value: s.heartbeat_coverage,
  }));

  return (
    <div className="space-y-4" data-testid="kpi-dashboard">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-anthrazit">KPI-Dashboard</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={loadSnapshots}
          className="h-7"
        >
          <RefreshCw className="h-3.5 w-3.5 mr-1" />
          Aktualisieren
        </Button>
      </div>

      {!latest ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          Noch keine Analytics-Daten vorhanden. Der Cron-Job erstellt taeglich
          Snapshots.
        </p>
      ) : (
        <>
          {/* North Star Metrik */}
          <div className="grid grid-cols-1 gap-3">
            <KpiMetricCard
              title="WAH — Woechentlich aktive Haushalte"
              value={latest.wah}
              previousValue={previous?.wah}
              description="North Star: Haushalte mit mindestens einer Interaktion in 7 Tagen"
            />
          </div>

          {/* Supporting Metrics */}
          <div className="grid grid-cols-2 gap-3">
            <KpiMetricCard
              title="Nutzer gesamt"
              value={latest.total_users}
              previousValue={previous?.total_users}
            />
            <KpiMetricCard
              title="Aktiv (7 Tage)"
              value={latest.active_users_7d}
              previousValue={previous?.active_users_7d}
            />
            <KpiMetricCard
              title="Aktivierung"
              value={latest.activation_rate}
              previousValue={previous?.activation_rate}
              format="percent"
            />
            <KpiMetricCard
              title="Retention (7d)"
              value={latest.retention_7d}
              previousValue={previous?.retention_7d}
              format="percent"
            />
            <KpiMetricCard
              title="Einladungs-Conversion"
              value={latest.invite_conversion_rate}
              previousValue={previous?.invite_conversion_rate}
              format="percent"
            />
            <KpiMetricCard
              title="MRR"
              value={latest.mrr}
              previousValue={previous?.mrr}
              format="currency"
            />
          </div>

          {/* Care-Metriken */}
          <div className="grid grid-cols-2 gap-3">
            <KpiMetricCard
              title="Heartbeat-Abdeckung"
              value={latest.heartbeat_coverage}
              previousValue={previous?.heartbeat_coverage}
              format="percent"
              description="Anteil Nutzer mit Heartbeat in 24h"
            />
            <KpiMetricCard
              title="Eskalationen"
              value={latest.escalation_count}
              previousValue={previous?.escalation_count}
              description="Offene Eskalationen"
            />
            <KpiMetricCard
              title="Plus-Abonnenten"
              value={latest.plus_subscribers}
              previousValue={previous?.plus_subscribers}
            />
            <KpiMetricCard
              title="Aktive Organisationen"
              value={latest.active_orgs}
              previousValue={previous?.active_orgs}
            />
          </div>

          {/* Trend-Charts */}
          <KpiTrendChart
            title="WAH-Verlauf (30 Tage)"
            data={wahTrend}
            color="#4CAF87"
          />
          <KpiTrendChart
            title="Aktive Nutzer (7 Tage)"
            data={userTrend}
            color="#2D3142"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <KpiTrendChart
              title="Beitraege pro Woche"
              data={postsTrend}
              color="#6366f1"
              height={160}
            />
            <KpiTrendChart
              title="Heartbeat-Abdeckung"
              data={heartbeatTrend}
              color="#f59e0b"
              unit="%"
              height={160}
            />
          </div>
        </>
      )}
    </div>
  );
}
