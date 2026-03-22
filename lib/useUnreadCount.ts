"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { getCachedUser } from "@/lib/supabase/cached-auth";

// Globaler Cache fuer komponentenuebergreifenden Zugriff
let globalCount = 0;
const listeners = new Set<(count: number) => void>();

function notify(count: number) {
  globalCount = count;
  listeners.forEach((fn) => fn(count));
}

export function useUnreadCount() {
  const [count, setCount] = useState(globalCount);

  const refresh = useCallback(async () => {
    const supabase = createClient();
    const { user } = await getCachedUser(supabase);
    if (!user) return;

    const { count: c } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("read", false);

    notify(c ?? 0);
  }, []);

  useEffect(() => {
    // Listener registrieren
    const handler = (c: number) => setCount(c);
    listeners.add(handler);

    // Initial laden
    refresh();

    // Realtime-Subscription
    const supabase = createClient();
    const channel = supabase
      .channel("unread-notifications")
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, () => {
        refresh();
      })
      .subscribe();

    return () => {
      listeners.delete(handler);
      supabase.removeChannel(channel);
    };
  }, [refresh]);

  return { count, refresh };
}
