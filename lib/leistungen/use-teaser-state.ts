"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { hasPlusAccess, type SubscriptionSnapshot } from "./check-plus";

export interface LeistungenTeaserState {
  ready: boolean;
  show: boolean;
  hasPlus: boolean;
}

// Client-Hook: laedt flag + subscription fuer den Teaser.
// Rendert Teaser nur wenn flag aktiv; `hasPlus` entscheidet, ob er direkt
// auf die Seite oder auf die Paywall verlinkt.
export function useLeistungenTeaserState(): LeistungenTeaserState {
  const [state, setState] = useState<LeistungenTeaserState>({
    ready: false,
    show: false,
    hasPlus: false,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const pilot = process.env.NEXT_PUBLIC_PILOT_MODE === "true";

        const flagResult = pilot
          ? { data: { enabled: true } }
          : await supabase
              .from("feature_flags")
              .select("enabled")
              .eq("key", "leistungen_info")
              .single();
        const enabled = flagResult.data?.enabled === true;

        const { data: auth } = await supabase.auth.getUser();
        const userId = auth?.user?.id;
        let subscription: SubscriptionSnapshot | null = null;
        if (userId) {
          const subsResult = await supabase
            .from("care_subscriptions")
            .select("plan, status, trial_ends_at")
            .eq("user_id", userId)
            .maybeSingle();
          subscription =
            (subsResult.data as SubscriptionSnapshot | null) ?? null;
        }

        if (cancelled) return;
        setState({
          ready: true,
          show: enabled,
          hasPlus: hasPlusAccess(subscription),
        });
      } catch {
        if (!cancelled) {
          setState({ ready: true, show: false, hasPlus: false });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
