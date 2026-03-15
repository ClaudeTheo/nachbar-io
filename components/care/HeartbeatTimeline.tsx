"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface HeartbeatTimelineProps {
  residentId: string;
}

interface DayActivity {
  date: string;
  hasActivity: boolean;
}

export function HeartbeatTimeline({ residentId }: HeartbeatTimelineProps) {
  const [days, setDays] = useState<DayActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadHeartbeats() {
      const supabase = createClient();
      const now = new Date();
      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data } = await supabase
        .from("heartbeats")
        .select("created_at")
        .eq("user_id", residentId)
        .gte("created_at", thirtyDaysAgo.toISOString())
        .order("created_at", { ascending: true });

      // Tage mit Aktivitaet sammeln
      const activeDays = new Set<string>();
      if (data) {
        for (const hb of data) {
          const day = hb.created_at.slice(0, 10); // YYYY-MM-DD
          activeDays.add(day);
        }
      }

      // 30-Tage-Array aufbauen
      const result: DayActivity[] = [];
      for (let i = 29; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().slice(0, 10);
        result.push({
          date: dateStr,
          hasActivity: activeDays.has(dateStr),
        });
      }

      setDays(result);
      setLoading(false);
    }

    loadHeartbeats();
  }, [residentId]);

  if (loading) return null;

  return (
    <div>
      <p className="mb-1 text-xs text-muted-foreground">Letzte 30 Tage</p>
      <div className="flex flex-wrap gap-0.5">
        {days.map((day) => (
          <div
            key={day.date}
            className="h-2 w-2 rounded-sm"
            style={{
              backgroundColor: day.hasActivity ? "#4CAF87" : "#E5E7EB",
            }}
            title={`${day.date}: ${day.hasActivity ? "Aktiv" : "Keine Aktivitaet"}`}
          />
        ))}
      </div>
    </div>
  );
}
