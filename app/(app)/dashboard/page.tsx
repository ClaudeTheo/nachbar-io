"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, ChevronRight, Plus } from "lucide-react";
import { AlertCard } from "@/components/AlertCard";
import { NewsCard } from "@/components/NewsCard";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import type { Alert, NewsItem, HelpRequest, MarketplaceItem } from "@/lib/supabase/types";

export default function DashboardPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [helpRequests, setHelpRequests] = useState<HelpRequest[]>([]);
  const [marketplaceItems, setMarketplaceItems] = useState<MarketplaceItem[]>([]);
  const [userName, setUserName] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const supabase = createClient();

    async function loadDashboard() {
      // Nutzername laden
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("users")
          .select("display_name")
          .eq("id", user.id)
          .single();
        if (profile) setUserName(profile.display_name);
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
    }

    loadDashboard();

    // Realtime-Subscription für neue Alerts
    const channel = supabase
      .channel("dashboard-alerts")
      .on("postgres_changes", { event: "*", schema: "public", table: "alerts" }, () => {
        loadDashboard();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return (
    <div className="space-y-6">
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
          <div className="space-y-3">
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

      {/* Leer-Zustand */}
      {alerts.length === 0 && news.length === 0 && helpRequests.length === 0 && marketplaceItems.length === 0 && (
        <div className="py-12 text-center">
          <div className="mb-4 text-5xl">🏘️</div>
          <h2 className="text-lg font-semibold text-anthrazit">
            Willkommen in Ihrem Quartier
          </h2>
          <p className="mt-2 text-muted-foreground">
            Hier sehen Sie bald Aktivitäten aus Ihrer Nachbarschaft.
          </p>
        </div>
      )}
    </div>
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
