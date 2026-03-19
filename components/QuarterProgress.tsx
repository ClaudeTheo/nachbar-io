"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { getQuarterProgress, getWeeklyDigest, type QuarterProgress as QP, type WeeklyDigest } from "@/lib/quarter-progress";

interface QuarterProgressProps {
  quarterId: string;
}

export function QuarterProgress({ quarterId }: QuarterProgressProps) {
  const [progress, setProgress] = useState<QP | null>(null);
  const [digest, setDigest] = useState<WeeklyDigest | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const [p, d] = await Promise.all([
        getQuarterProgress(supabase, quarterId),
        getWeeklyDigest(supabase, quarterId),
      ]);
      setProgress(p);
      setDigest(d);
    }
    load();
  }, [quarterId]);

  if (!progress) return null;

  return (
    <Card className="border-quartier-green/20">
      <CardContent className="p-4 space-y-3">
        {/* Barometer */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-anthrazit">Quartier-Fortschritt</span>
            <span className="text-xs text-muted-foreground">
              {progress.connectedHouseholds} von {progress.totalHouseholds} Haushalten
            </span>
          </div>
          <div className="h-3 w-full rounded-full bg-gray-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-quartier-green transition-all duration-1000 ease-out"
              style={{ width: `${progress.percentage}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {progress.percentage}% vernetzt
            {progress.nextMilestone && (
              <> — noch {progress.householdsToNextMilestone} bis zum nächsten Meilenstein</>
            )}
          </p>
        </div>

        {/* Aktueller Meilenstein */}
        {progress.currentMilestone && (
          <div className="rounded-lg bg-quartier-green/5 p-2 text-center">
            <span className="text-sm">
              {progress.currentMilestone.emoji} {progress.currentMilestone.message}
            </span>
          </div>
        )}

        {/* Wochen-Digest */}
        {digest && (digest.boardPosts > 0 || digest.helpOffered > 0 || digest.eventsCreated > 0 || digest.newMembers > 0) && (
          <div className="grid grid-cols-2 gap-2 text-center">
            {digest.helpOffered > 0 && (
              <div className="rounded-lg bg-blue-50 p-2">
                <p className="text-lg font-bold text-blue-600">{digest.helpOffered}</p>
                <p className="text-[10px] text-muted-foreground">Hilfsangebote</p>
              </div>
            )}
            {digest.eventsCreated > 0 && (
              <div className="rounded-lg bg-purple-50 p-2">
                <p className="text-lg font-bold text-purple-600">{digest.eventsCreated}</p>
                <p className="text-[10px] text-muted-foreground">Events</p>
              </div>
            )}
            {digest.newMembers > 0 && (
              <div className="rounded-lg bg-green-50 p-2">
                <p className="text-lg font-bold text-quartier-green">{digest.newMembers}</p>
                <p className="text-[10px] text-muted-foreground">Neue Nachbarn</p>
              </div>
            )}
            {digest.boardPosts > 0 && (
              <div className="rounded-lg bg-amber-50 p-2">
                <p className="text-lg font-bold text-alert-amber">{digest.boardPosts}</p>
                <p className="text-[10px] text-muted-foreground">Beiträge</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
