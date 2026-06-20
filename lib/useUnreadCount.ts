"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { getCachedUser } from "@/lib/supabase/cached-auth";

// Globaler Cache fuer komponentenuebergreifenden Zugriff
let globalCount = 0;
const listeners = new Set<(count: number) => void>();
let unreadSubscriberCount = 0;
let unreadSubscriptionSequence = 0;

type SupabaseBrowserClient = ReturnType<typeof createClient>;
type UnreadSubscription = {
  supabase: SupabaseBrowserClient;
  channel: ReturnType<SupabaseBrowserClient["channel"]>;
};

let unreadSubscription: UnreadSubscription | null = null;

function notify(count: number) {
  globalCount = count;
  listeners.forEach((fn) => fn(count));
}

async function refreshUnreadCount() {
  const supabase = createClient();
  const { user } = await getCachedUser(supabase);
  if (!user) return;

  const { count: c } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("read", false);

  notify(c ?? 0);
}

function retainUnreadSubscription() {
  unreadSubscriberCount += 1;

  if (unreadSubscription) return;

  const supabase = createClient();
  const channel = supabase
    .channel(`unread-notifications-${++unreadSubscriptionSequence}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "notifications" },
      () => {
        void refreshUnreadCount();
      },
    )
    .subscribe();

  unreadSubscription = { supabase, channel };
}

function releaseUnreadSubscription() {
  unreadSubscriberCount = Math.max(0, unreadSubscriberCount - 1);
  if (unreadSubscriberCount !== 0 || !unreadSubscription) return;

  const { supabase, channel } = unreadSubscription;
  unreadSubscription = null;
  void supabase.removeChannel(channel);
}

export function useUnreadCount() {
  const [count, setCount] = useState(globalCount);

  const refresh = useCallback(() => refreshUnreadCount(), []);

  useEffect(() => {
    // Listener registrieren
    const handler = (c: number) => setCount(c);
    listeners.add(handler);

    // Initial laden
    refresh();

    retainUnreadSubscription();

    return () => {
      listeners.delete(handler);
      releaseUnreadSubscription();
    };
  }, [refresh]);

  return { count, refresh };
}
