"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Bell, ChevronRight, Plus } from "lucide-react";
import { AlertCard } from "@/components/AlertCard";
import { NewsCard } from "@/components/NewsCard";
import { PullToRefresh } from "@/components/PullToRefresh";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import type { Alert, NewsItem, HelpRequest, MarketplaceItem } from "@/lib/supabase/types";

export default function DashboardPage() {
  const router = useRouter();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [helpRequests, setHelpRequests] = useState<HelpRequest[]>([]);
  const [marketplaceItems, setMarketplaceItems] = useState<MarketplaceItem[]>([]);
  const [userName, setUserName] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);

  const loadDashboard = useCallback(async () => {
    const supabase = createClient();

    // Nutzerprofil laden + Onboarding-Pruefung
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("users")
        .select("display_name, settings, created_at")
        .eq("id", user.id)
        .single();
      if (profile) {
        setUserName(profile.display_name);

        // Onboarding: Neue Nutzer (< 24h) zur Tour weiterleiten
        const settings = profile.settings as Record<string, unknown> | null;
        if (!settings?.onboarding_completed) {
          const createdAt = new Date(profile.created_at);
          const hoursSince = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60);
          if (hoursSince < 24) {
            router.push("/welcome");
            return;
          }
        }
      }
    }

    // Aktive Alerts laden (neueste zuerst)
    const { data: alertData } = await supabase
      .from("alerts")
      .select("*, user:users(display_name, avatar_url), household:households(street_name, house_number, lat, lng)")
      .in("status", ["open", "help_coming"])
      .order("created_at", { ascending: false })
      .limit(5);
    if (alertData) setAlerts(alertData as unknown as Alert[]);

    // Neueste News laden
    const { data: newsData } = await supabase
      .from("news_items")
      .select("*")
      .gte("relevance_score", 5)
      .order("created_at", { ascending: false })
      .limit(3);
    if (newsData) setNews(newsData);

    // Aktive Hilfe-Gesuche
    const { data: helpData } = await supabase
      .from("help_requests")
      .select("*, user:users(display_name, avatar_url)")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(3);
    if (helpData) setHelpRequests(helpData as unknown as HelpRequest[]);

    // Neueste Marktplatz-Inserate
    const { data: marketData } = await supabase
      .from("marketplace_items")
      .select("*, user:users(display_name, avatar_url)")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(3);
    if (marketData) setMarketplaceItems(marketData as unknown as MarketplaceItem[]);

    // Ungelesene Benachrichtigungen
    if (user) {
      const { count } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("read", false);
      setUnreadCount(count ?? 0);
    }
  }, []);

  useEffect(() => {
    loadDashboard();

    // Realtime-Subscription für neue Alerts
    const supabase = createClient();
    const channel = supabase
      .channel("dashboard-alerts")
      .on("postgres_changes", { event: "*", schema: "public", table: "alerts" }, () => {
        loadDashboard();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [loadDashboard]);

  return (
    <PullToRefresh onRefresh={loadDashboard}>
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-anthrazit">
            {userName ? `Hallo, ${userName}` : "nachbar.io"}
          </h1>
          <p className="text-sm text-muted-foreground">Ihr Quartier auf einen Blick</p>
        </div>
        <Link
          href="/profile"
          className="relative rounded-full p-2 hover:bg-muted"
          aria-label="Benachrichtigungen"
        >
          <Bell className="h-6 w-6 text-anthrazit" />
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-emergency-red text-xs font-bold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Link>
      </div>

      {/* Aktive Hilfeanfragen */}
      {alerts.length > 0 && (
        <section>
          <SectionHeader title="Aktuelle Hilfeanfragen" href="/alerts" count={alerts.length} />
          <div className="space-y-3 animate-stagger">
            {alerts.map((alert) => (
              <AlertCard key={alert.id} alert={alert} />
            ))}
          </div>
        </section>
      )}

      {/* Schnell-Hilfe Button */}
      <Link
        href="/alerts/new"
        className="flex items-center justify-center gap-2 rounded-xl bg-alert-amber p-4 font-semibold text-white shadow-md transition-transform hover:scale-[1.02] active:scale-[0.98]"
      >
        <Plus className="h-5 w-5" />
        Hilfe anfragen
      </Link>

      {/* Hilfe-Börse */}
      {helpRequests.length > 0 && (
        <section>
          <SectionHeader title="Hilfe-Börse" href="/help" />
          <div className="space-y-2">
            {helpRequests.map((req) => (
              <Link
                key={req.id}
                href="/help"
                className="flex items-center justify-between rounded-lg bg-white p-3 shadow-sm"
              >
                <div>
                  <p className="font-medium text-anthrazit">{req.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {req.user?.display_name} · {req.type === "need" ? "Sucht Hilfe" : "Bietet Hilfe"}
                  </p>
                </div>
                <Badge variant={req.type === "need" ? "default" : "secondary"}>
                  {req.type === "need" ? "Gesucht" : "Angebot"}
                </Badge>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Marktplatz */}
      {marketplaceItems.length > 0 && (
        <section>
          <SectionHeader title="Marktplatz" href="/marketplace" />
          <div className="space-y-2">
            {marketplaceItems.map((item) => (
              <Link
                key={item.id}
                href={`/marketplace/${item.id}`}
                className="flex items-center justify-between rounded-lg bg-white p-3 shadow-sm"
              >
                <div>
                  <p className="font-medium text-anthrazit">{item.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.user?.display_name} · {item.price ? `${item.price} €` : "Geschenkt"}
                  </p>
                </div>
                <Badge variant="secondary">{item.type === "give" ? "Geschenkt" : item.type === "lend" ? "Leihen" : "Kaufen"}</Badge>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Quartiersnews */}
      {news.length > 0 && (
        <section>
          <SectionHeader title="Quartiersnews" href="/news" />
          <div className="space-y-3">
            {news.map((item) => (
              <NewsCard key={item.id} item={item} />
            ))}
          </div>
        </section>
      )}

      {/* Leer-Zustand mit Demo-Vorschau */}
      {alerts.length === 0 && news.length === 0 && helpRequests.length === 0 && marketplaceItems.length === 0 && (
        <div className="space-y-4">
          <div className="py-6 text-center">
            <div className="mb-3 text-5xl">🏘️</div>
            <h2 className="text-lg font-semibold text-anthrazit">
              Willkommen in Ihrem Quartier
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Purkersdorfer Str. · Sanarystr. · Oberer Rebberg
            </p>
          </div>

          {/* Demo-News als Vorschau */}
          <section>
            <SectionHeader title="Quartiersnews" href="/news" />
            <div className="space-y-2">
              <div className="rounded-lg bg-white p-3 shadow-sm">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>🏗️</span><span>Infrastruktur</span><span>·</span><span>Heute</span>
                </div>
                <p className="mt-1 font-medium text-anthrazit">Kanalarbeiten Sanarystraße ab Montag</p>
                <p className="mt-0.5 text-sm text-muted-foreground">Halbseitige Sperrung für ca. 3 Tage.</p>
              </div>
              <div className="rounded-lg bg-white p-3 shadow-sm">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>♻️</span><span>Abfallwirtschaft</span><span>·</span><span>Gestern</span>
                </div>
                <p className="mt-1 font-medium text-anthrazit">Gelber Sack: Nächste Abholung Donnerstag</p>
              </div>
            </div>
          </section>

          {/* Schnelleinstieg */}
          <section>
            <h2 className="mb-2 font-semibold text-anthrazit">Entdecken</h2>
            <div className="grid grid-cols-3 gap-2">
              <Link href="/map" className="flex flex-col items-center gap-1 rounded-lg bg-white p-3 shadow-sm hover:bg-muted/50">
                <span className="text-2xl">🗺️</span>
                <span className="text-xs font-medium text-anthrazit">Karte</span>
              </Link>
              <Link href="/help" className="flex flex-col items-center gap-1 rounded-lg bg-white p-3 shadow-sm hover:bg-muted/50">
                <span className="text-2xl">🤝</span>
                <span className="text-xs font-medium text-anthrazit">Hilfe-Börse</span>
              </Link>
              <Link href="/marketplace" className="flex flex-col items-center gap-1 rounded-lg bg-white p-3 shadow-sm hover:bg-muted/50">
                <span className="text-2xl">🛒</span>
                <span className="text-xs font-medium text-anthrazit">Marktplatz</span>
              </Link>
              <Link href="/events" className="flex flex-col items-center gap-1 rounded-lg bg-white p-3 shadow-sm hover:bg-muted/50">
                <span className="text-2xl">📅</span>
                <span className="text-xs font-medium text-anthrazit">Events</span>
              </Link>
              <Link href="/messages" className="flex flex-col items-center gap-1 rounded-lg bg-white p-3 shadow-sm hover:bg-muted/50">
                <span className="text-2xl">💬</span>
                <span className="text-xs font-medium text-anthrazit">Nachrichten</span>
              </Link>
              <Link href="/lost-found" className="flex flex-col items-center gap-1 rounded-lg bg-white p-3 shadow-sm hover:bg-muted/50">
                <span className="text-2xl">🔍</span>
                <span className="text-xs font-medium text-anthrazit">Fundbüro</span>
              </Link>
              <Link href="/experts" className="flex flex-col items-center gap-1 rounded-lg bg-white p-3 shadow-sm hover:bg-muted/50">
                <span className="text-2xl">⭐</span>
                <span className="text-xs font-medium text-anthrazit">Experten</span>
              </Link>
            </div>
          </section>
        </div>
      )}
    </div>
    </PullToRefresh>
  );
}

// Section-Header Komponente
function SectionHeader({ title, href, count }: { title: string; href: string; count?: number }) {
  return (
    <div className="mb-2 flex items-center justify-between">
      <h2 className="font-semibold text-anthrazit">
        {title}
        {count !== undefined && count > 0 && (
          <span className="ml-2 text-sm text-alert-amber">({count})</span>
        )}
      </h2>
      <Link href={href} className="flex items-center text-xs text-quartier-green hover:underline">
        Alle anzeigen <ChevronRight className="h-3 w-3" />
      </Link>
    </div>
  );
}
