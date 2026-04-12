// Hook: Termine im Familienkreis laden
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getCachedUser } from "@/lib/supabase/cached-auth";
import type { CircleEvent } from "@/lib/services/circle-events.service";

interface UseCircleEventsResult {
  events: CircleEvent[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/** Laedt kommende Termine des aktuellen Bewohners */
export function useCircleEvents(): UseCircleEventsResult {
  const [events, setEvents] = useState<CircleEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const supabase = createClient();

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const { user } = await getCachedUser(supabase);
        if (!user) {
          setLoading(false);
          return;
        }

        const { data, error: dbError } = await supabase
          .from("circle_events")
          .select()
          .eq("resident_id", user.id)
          .is("deleted_at", null)
          .gte("scheduled_at", new Date().toISOString())
          .order("scheduled_at", { ascending: true });

        if (dbError) {
          setError("Termine konnten nicht geladen werden");
          return;
        }

        setEvents((data ?? []) as CircleEvent[]);
      } catch {
        setError("Unerwarteter Fehler");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [tick]);

  return { events, loading, error, refetch: () => setTick((t) => t + 1) };
}
