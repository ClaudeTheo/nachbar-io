"use client";

import { useState, useEffect, useRef } from "react";
import { AlertTriangle, HandHelping, ShoppingBag, MapPin, UserPlus, Calendar, Clock, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

type ActivityType = "alert" | "help_request" | "marketplace" | "lost_found" | "registration" | "event";

interface ActivityItem {
  id: string;
  type: ActivityType;
  title: string;
  description: string;
  user_name: string;
  created_at: string;
  status?: string;
}

const ACTIVITY_ICONS: Record<ActivityType, React.ReactNode> = {
  alert: <AlertTriangle className="h-4 w-4 text-alert-amber" />,
  help_request: <HandHelping className="h-4 w-4 text-blue-500" />,
  marketplace: <ShoppingBag className="h-4 w-4 text-purple-500" />,
  lost_found: <MapPin className="h-4 w-4 text-orange-500" />,
  registration: <UserPlus className="h-4 w-4 text-quartier-green" />,
  event: <Calendar className="h-4 w-4 text-indigo-500" />,
};

const ACTIVITY_LABELS: Record<ActivityType, string> = {
  alert: "Meldung",
  help_request: "Hilfe-Boerse",
  marketplace: "Marktplatz",
  lost_found: "Fundbuero",
  registration: "Registrierung",
  event: "Veranstaltung",
};

const AUTO_REFRESH_INTERVAL = 30000; // 30 Sekunden
const PAGE_SIZE = 20;

export function ActivityFeed() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ActivityType | "all">("all");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function loadActivities() {
    setLoading(true);
    const supabase = createClient();

    // Alle Datenquellen parallel laden
    const [
      { data: alerts },
      { data: helpRequests },
      { data: marketplace },
      { data: lostFound },
      { data: users },
      { data: events },
    ] = await Promise.all([
      supabase
        .from("alerts")
        .select("id, title, description, status, created_at, user:users(display_name)")
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("help_requests")
        .select("id, title, description, status, type, created_at, user:users(display_name)")
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("marketplace_items")
        .select("id, title, description, status, type, created_at, user:users(display_name)")
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("lost_found")
        .select("id, title, description, status, type, created_at, user:users(display_name)")
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("users")
        .select("id, display_name, created_at")
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("events")
        .select("id, title, description, category, event_date, created_at, user:users(display_name)")
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

    // Zu einheitlichem Format konvertieren
    const allActivities: ActivityItem[] = [];

    (alerts ?? []).forEach((a: Record<string, unknown>) => {
      const user = a.user as { display_name: string } | null;
      allActivities.push({
        id: `alert-${a.id}`,
        type: "alert",
        title: a.title as string,
        description: `${a.status === "open" ? "Neue Meldung" : a.status === "resolved" ? "Erledigt" : "Hilfe kommt"}`,
        user_name: user?.display_name ?? "Unbekannt",
        created_at: a.created_at as string,
        status: a.status as string,
      });
    });

    (helpRequests ?? []).forEach((h: Record<string, unknown>) => {
      const user = h.user as { display_name: string } | null;
      allActivities.push({
        id: `help-${h.id}`,
        type: "help_request",
        title: h.title as string,
        description: h.type === "need" ? "Sucht Hilfe" : "Bietet Hilfe an",
        user_name: user?.display_name ?? "Unbekannt",
        created_at: h.created_at as string,
        status: h.status as string,
      });
    });

    (marketplace ?? []).forEach((m: Record<string, unknown>) => {
      const user = m.user as { display_name: string } | null;
      const typeLabels: Record<string, string> = { sell: "Verkauft", give: "Verschenkt", search: "Sucht", lend: "Verleiht" };
      allActivities.push({
        id: `market-${m.id}`,
        type: "marketplace",
        title: m.title as string,
        description: typeLabels[(m.type as string)] ?? (m.type as string),
        user_name: user?.display_name ?? "Unbekannt",
        created_at: m.created_at as string,
        status: m.status as string,
      });
    });

    (lostFound ?? []).forEach((l: Record<string, unknown>) => {
      const user = l.user as { display_name: string } | null;
      allActivities.push({
        id: `lf-${l.id}`,
        type: "lost_found",
        title: l.title as string,
        description: l.type === "lost" ? "Verloren" : "Gefunden",
        user_name: user?.display_name ?? "Unbekannt",
        created_at: l.created_at as string,
        status: l.status as string,
      });
    });

    (users ?? []).forEach((u: Record<string, unknown>) => {
      allActivities.push({
        id: `reg-${u.id}`,
        type: "registration",
        title: u.display_name as string,
        description: "Hat sich registriert",
        user_name: u.display_name as string,
        created_at: u.created_at as string,
      });
    });

    (events ?? []).forEach((e: Record<string, unknown>) => {
      const user = e.user as { display_name: string } | null;
      allActivities.push({
        id: `event-${e.id}`,
        type: "event",
        title: e.title as string,
        description: `Veranstaltung am ${new Date(e.event_date as string).toLocaleDateString("de-DE")}`,
        user_name: user?.display_name ?? "Unbekannt",
        created_at: e.created_at as string,
      });
    });

    // Nach Datum sortieren (neueste zuerst)
    allActivities.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    setActivities(allActivities);
    setLastRefresh(new Date());
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadActivities();
  }, []);

  // Auto-Refresh
  useEffect(() => {
    if (autoRefresh) {
      timerRef.current = setInterval(() => {
        loadActivities();
      }, AUTO_REFRESH_INTERVAL);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [autoRefresh]);

  // Relative Zeit formatieren
  function timeAgo(dateStr: string): string {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMin < 1) return "Gerade eben";
    if (diffMin < 60) return `vor ${diffMin} Min.`;
    if (diffHours < 24) return `vor ${diffHours} Std.`;
    if (diffDays < 7) return `vor ${diffDays} Tag${diffDays > 1 ? "en" : ""}`;
    return new Date(dateStr).toLocaleDateString("de-DE");
  }

  // Tages-Gruppen bilden
  function groupByDate(items: ActivityItem[]): Map<string, ActivityItem[]> {
    const groups = new Map<string, ActivityItem[]>();
    items.forEach((item) => {
      const date = new Date(item.created_at);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      let key: string;
      if (date.toDateString() === today.toDateString()) {
        key = "Heute";
      } else if (date.toDateString() === yesterday.toDateString()) {
        key = "Gestern";
      } else {
        key = date.toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" });
      }

      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(item);
    });
    return groups;
  }

  const typeCounts = activities.reduce((acc, a) => {
    acc[a.type] = (acc[a.type] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const filteredActivities = filter === "all" ? activities : activities.filter(a => a.type === filter);
  const paginatedActivities = filteredActivities.slice(0, visibleCount);
  const hasMore = filteredActivities.length > visibleCount;

  const grouped = groupByDate(paginatedActivities);

  return (
    <div className="space-y-4">
      {/* Header mit Auto-Refresh */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>Aktualisiert: {lastRefresh.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant={autoRefresh ? "default" : "outline"}
            className="text-xs h-7"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <RefreshCw className={`h-3 w-3 mr-1 ${autoRefresh ? "animate-spin" : ""}`} style={autoRefresh ? { animationDuration: "3s" } : undefined} />
            {autoRefresh ? "Live" : "Pause"}
          </Button>
          <Button size="sm" variant="outline" className="text-xs h-7" onClick={loadActivities} disabled={loading}>
            Aktualisieren
          </Button>
        </div>
      </div>

      {/* Typ-Filter */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        <Button
          size="sm"
          variant={filter === "all" ? "default" : "outline"}
          className="text-xs h-7 shrink-0"
          onClick={() => { setFilter("all"); setVisibleCount(PAGE_SIZE); }}
        >
          Alle ({activities.length})
        </Button>
        {(Object.keys(ACTIVITY_LABELS) as ActivityType[]).map((type) => (
          <Button
            key={type}
            size="sm"
            variant={filter === type ? "default" : "outline"}
            className="text-xs h-7 shrink-0"
            onClick={() => { setFilter(type); setVisibleCount(PAGE_SIZE); }}
          >
            {ACTIVITY_ICONS[type]}
            <span className="ml-1">{typeCounts[type] ?? 0}</span>
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="py-8 text-center text-muted-foreground">Laden...</div>
      ) : (
        <>
          {[...grouped.entries()].map(([date, items]) => (
            <div key={date}>
              <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {date}
              </p>

              <div className="space-y-1 relative">
                {/* Zeitlinie */}
                <div className="absolute left-[15px] top-2 bottom-2 w-px bg-border" />

                {items.map((item) => (
                  <div key={item.id} className="flex items-start gap-3 py-1.5 relative">
                    {/* Icon */}
                    <div className="z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white border">
                      {ACTIVITY_ICONS[item.type]}
                    </div>

                    {/* Inhalt */}
                    <div className="min-w-0 flex-1 pt-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-anthrazit truncate">{item.title}</p>
                        <Badge variant="outline" className="text-[10px] h-4 shrink-0">
                          {ACTIVITY_LABELS[item.type]}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {item.user_name} · {item.description} · {timeAgo(item.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Mehr laden */}
          {hasMore && (
            <Button
              variant="outline"
              className="w-full text-xs"
              onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
            >
              Mehr laden ({filteredActivities.length - visibleCount} weitere)
            </Button>
          )}

          {paginatedActivities.length === 0 && (
            <p className="py-8 text-center text-muted-foreground">
              Keine Aktivitaeten gefunden.
            </p>
          )}
        </>
      )}
    </div>
  );
}
