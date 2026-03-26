"use client";

import { useEffect, useState } from "react";
import { TrendingUp, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import {
  REPUTATION_LEVELS,
  ACTIVITY_BADGES,
  computeReputationStats,
  getProgressToNextLevel,
} from "@/lib/reputation";
import type { ReputationStats } from "@/lib/supabase/types";

export default function ReputationPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<ReputationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function loadStats() {
    if (!user) return;
    const supabase = createClient();

    try {
      const computed = await computeReputationStats(supabase, user.id);
      setStats(computed);
    } catch (err) {
      console.error("Reputation konnte nicht geladen werden:", err);
    }
  }

  useEffect(() => {
    if (!user) return;
    loadStats().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function handleRefresh() {
    setRefreshing(true);
    await loadStats();
    setRefreshing(false);
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 rounded bg-muted" />
          <div className="h-6 w-48 rounded bg-muted" />
        </div>
        <div className="h-32 rounded-xl bg-muted" />
        <div className="grid grid-cols-2 gap-3">
          <div className="h-20 rounded-lg bg-muted" />
          <div className="h-20 rounded-lg bg-muted" />
          <div className="h-20 rounded-lg bg-muted" />
          <div className="h-20 rounded-lg bg-muted" />
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        Reputation konnte nicht geladen werden.
      </div>
    );
  }

  const progress = getProgressToNextLevel(stats.points);
  const currentLevel =
    REPUTATION_LEVELS.find((l) => l.level === stats.level) ??
    REPUTATION_LEVELS[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Meine Reputation"
        backHref="/profile"
        actions={
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw
              className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
            />
          </Button>
        }
      />

      {/* Level-Karte */}
      <Card className="overflow-hidden">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div
              className={`flex h-16 w-16 items-center justify-center rounded-2xl text-3xl ${currentLevel.bgColor}`}
            >
              {currentLevel.icon}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className={`text-lg font-bold ${currentLevel.color}`}>
                {currentLevel.name}
              </h2>
              <p className="text-sm text-muted-foreground">
                {stats.points} Punkte gesammelt
              </p>
            </div>
          </div>

          {/* Fortschrittsbalken */}
          {progress.nextLevel && (
            <div className="mt-5">
              <div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground">
                <span>Level {stats.level}</span>
                <span className="flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  Noch {progress.pointsToNext} Punkte bis Level{" "}
                  {stats.level + 1}
                </span>
              </div>
              <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-quartier-green transition-all duration-500"
                  style={{ width: `${progress.progress}%` }}
                />
              </div>
              <p className="mt-1 text-right text-xs text-muted-foreground">
                {progress.nextLevel.icon} {progress.nextLevel.name}
              </p>
            </div>
          )}

          {/* Max-Level erreicht */}
          {!progress.nextLevel && (
            <p className="mt-4 text-center text-sm text-muted-foreground">
              Sie haben das hoechste Level erreicht — vielen Dank fuer Ihr
              Engagement!
            </p>
          )}
        </CardContent>
      </Card>

      {/* Impact-Statistik */}
      <div>
        <h3 className="mb-3 font-semibold text-anthrazit">Ihr Beitrag</h3>
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            icon="🩹"
            label="Nachbarn geholfen"
            value={stats.alertsHelped}
          />
          <StatCard
            icon="🤝"
            label="Hilfe-Aktionen"
            value={stats.helpActionsCompleted}
          />
          <StatCard
            icon="🎁"
            label="Artikel geteilt"
            value={stats.itemsShared}
          />
          <StatCard
            icon="📅"
            label="Events besucht"
            value={stats.eventsAttended}
          />
        </div>
      </div>

      {/* Experten-Anerkennung */}
      {(stats.endorsementsReceived > 0 || stats.reviewsReceived > 0) && (
        <div>
          <h3 className="mb-3 font-semibold text-anthrazit">
            Experten-Anerkennung
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              icon="👍"
              label="Empfehlungen"
              value={stats.endorsementsReceived}
            />
            <StatCard
              icon="⭐"
              label="Gute Bewertungen"
              value={stats.reviewsReceived}
            />
          </div>
        </div>
      )}

      {/* Badges */}
      <div>
        <h3 className="mb-3 font-semibold text-anthrazit">Badges</h3>
        <div className="grid grid-cols-2 gap-3">
          {ACTIVITY_BADGES.map((badge) => {
            const earned = stats.badges.includes(badge.id);
            return (
              <div
                key={badge.id}
                className={`flex items-center gap-3 rounded-lg border p-3 transition-colors ${
                  earned
                    ? "border-border bg-white"
                    : "border-transparent bg-muted/30 opacity-40"
                }`}
                title={earned ? badge.description : `Noch nicht freigeschaltet`}
              >
                <span className="text-xl">{badge.icon}</span>
                <div className="min-w-0">
                  <p
                    className={`text-sm font-medium ${earned ? "text-anthrazit" : "text-muted-foreground"}`}
                  >
                    {badge.label}
                  </p>
                  {earned && (
                    <p className="truncate text-xs text-muted-foreground">
                      {badge.description}
                    </p>
                  )}
                  {!earned && (
                    <p className="text-xs text-muted-foreground">
                      Noch nicht freigeschaltet
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Level-Uebersicht */}
      <div>
        <h3 className="mb-3 font-semibold text-anthrazit">Alle Level</h3>
        <div className="space-y-2">
          {REPUTATION_LEVELS.map((lvl) => {
            const isActive = lvl.level === stats.level;
            const isReached = lvl.level <= stats.level;
            return (
              <div
                key={lvl.level}
                className={`flex items-center gap-3 rounded-lg border p-3 ${
                  isActive
                    ? "border-quartier-green/50 bg-quartier-green/5"
                    : isReached
                      ? "border-border bg-white"
                      : "border-transparent bg-muted/30 opacity-50"
                }`}
              >
                <span className="text-xl">{lvl.icon}</span>
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm font-semibold ${isActive ? "text-anthrazit" : "text-muted-foreground"}`}
                  >
                    {lvl.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Ab {lvl.minPoints} Punkte
                  </p>
                </div>
                {isActive && (
                  <span className="text-xs font-medium text-quartier-green">
                    Aktuell
                  </span>
                )}
                {isReached && !isActive && (
                  <span className="text-xs text-muted-foreground">✓</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Info-Text */}
      <p className="text-center text-xs text-muted-foreground">
        Ihre Reputation wird aus Ihrem Engagement in der Nachbarschaft
        berechnet. Helfen Sie Nachbarn, teilen Sie Artikel und besuchen Sie
        Events.
      </p>
    </div>
  );
}

// Statistik-Karte
function StatCard({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-white p-3">
      <span className="text-xl">{icon}</span>
      <div>
        <p className="text-lg font-bold text-anthrazit">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}
