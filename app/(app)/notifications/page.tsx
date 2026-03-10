"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { useUnreadCount } from "@/lib/useUnreadCount";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";
import type { Notification } from "@/lib/supabase/types";

const TYPE_ICONS: Record<string, string> = {
  alert: "\uD83D\uDEA8",
  alert_response: "\uD83E\uDD1D",
  help_match: "\uD83E\uDD1D",
  help_response: "\uD83D\uDCAC",
  marketplace: "\uD83D\uDED2",
  leihboerse: "\uD83D\uDD04",
  lost_found: "\uD83D\uDD0D",
  message: "\u2709\uFE0F",
  event_participation: "\uD83D\uDCC5",
  expert_review: "\u2B50",
  expert_endorsement: "\uD83D\uDC4D",
  connection_accepted: "\uD83E\uDD1D",
  connection_declined: "\uD83D\uDEAB",
  poll_vote: "\uD83D\uDDF3\uFE0F",
  tip_confirmation: "\u2705",
  news: "\uD83D\uDCF0",
  checkin_reminder: "\u2764\uFE0F",
  system: "\u2699\uFE0F",
};

const TYPE_ROUTES: Record<string, string> = {
  alert: "/alerts",
  alert_response: "/alerts",
  help_match: "/help",
  help_response: "/help",
  marketplace: "/marketplace",
  leihboerse: "/leihboerse",
  lost_found: "/lost-found",
  message: "/messages",
  event_participation: "/events",
  expert_review: "/experts",
  expert_endorsement: "/experts",
  connection_accepted: "/messages",
  connection_declined: "/messages",
  poll_vote: "/polls",
  tip_confirmation: "/tips",
  news: "/news",
  checkin_reminder: "/senior/checkin",
  system: "/dashboard",
};

export default function NotificationsInboxPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const { refresh: refreshUnread } = useUnreadCount();

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (data) setNotifications(data as Notification[]);
      setLoading(false);
    }
    load();
  }, []);

  async function markAsRead(notif: Notification) {
    if (!notif.read) {
      const supabase = createClient();
      await supabase
        .from("notifications")
        .update({ read: true })
        .eq("id", notif.id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n))
      );
      refreshUnread();
    }

    // Zur referenzierten Seite navigieren
    const route = TYPE_ROUTES[notif.type] || "/dashboard";
    if (notif.reference_id && notif.reference_type) {
      router.push(`${route}/${notif.reference_id}`);
    } else {
      router.push(route);
    }
  }

  async function markAllAsRead() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", user.id)
      .eq("read", false);

    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    refreshUnread();
  }

  const unreadExists = notifications.some((n) => !n.read);

  // Benachrichtigungen nach Datum gruppieren
  function groupByDate(items: Notification[]) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const groups: { label: string; items: Notification[] }[] = [
      { label: "Heute", items: [] },
      { label: "Gestern", items: [] },
      { label: "Älter", items: [] },
    ];

    for (const item of items) {
      const date = new Date(item.created_at);
      date.setHours(0, 0, 0, 0);
      if (date >= today) {
        groups[0].items.push(item);
      } else if (date >= yesterday) {
        groups[1].items.push(item);
      } else {
        groups[2].items.push(item);
      }
    }

    return groups.filter((g) => g.items.length > 0);
  }

  if (loading) {
    return (
      <div className="space-y-4 animate-fade-in-up">
        <h1 className="text-xl font-bold text-anthrazit">Benachrichtigungen</h1>
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    );
  }

  const groups = groupByDate(notifications);

  return (
    <div className="space-y-4 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-anthrazit">Benachrichtigungen</h1>
        {unreadExists && (
          <Button
            variant="ghost"
            size="sm"
            onClick={markAllAsRead}
            className="text-xs text-muted-foreground"
          >
            <CheckCheck className="mr-1 h-4 w-4" />
            Alle gelesen
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="py-16 text-center">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <Bell className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground">Keine Benachrichtigungen</p>
          <p className="mt-1 text-sm text-muted-foreground/60">
            Hier erscheinen Meldungen aus Ihrem Quartier.
          </p>
        </div>
      ) : (
        groups.map((group) => (
          <div key={group.label}>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {group.label}
            </p>
            <div className="space-y-1">
              {group.items.map((notif) => (
                <button
                  key={notif.id}
                  onClick={() => markAsRead(notif)}
                  className={`card-interactive flex w-full items-start gap-3 rounded-lg p-3 text-left ${
                    notif.read
                      ? "bg-white"
                      : "bg-quartier-green/5"
                  }`}
                >
                  <span className="mt-0.5 text-xl">
                    {TYPE_ICONS[notif.type] || "\uD83D\uDD14"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm ${notif.read ? "text-anthrazit" : "font-semibold text-anthrazit"}`}>
                      {notif.title}
                    </p>
                    {notif.body && (
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {notif.body}
                      </p>
                    )}
                    <p className="mt-1 text-[11px] text-muted-foreground/60">
                      {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true, locale: de })}
                    </p>
                  </div>
                  {!notif.read && (
                    <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-quartier-green" />
                  )}
                </button>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
