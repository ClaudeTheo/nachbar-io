"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Search, Pin, ExternalLink } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useQuarter } from "@/lib/quarters";
import {
  SERVICE_LINK_CATEGORIES,
  WIKI_CATEGORIES,
  ANNOUNCEMENT_CATEGORIES,
  DISCLAIMERS,
} from "@/lib/municipal";
import type { MunicipalAnnouncement, AnnouncementCategory } from "@/lib/municipal";

type TabId = "services" | "wiki" | "announcements";

// Deutsches Datumsformat
function formatDateDE(iso: string): string {
  return new Date(iso).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

// Kategorie-Config Hilfsfunktion
function getCategoryConfig(catId: AnnouncementCategory) {
  return ANNOUNCEMENT_CATEGORIES.find((c) => c.id === catId) ?? ANNOUNCEMENT_CATEGORIES[5];
}

export default function CityServicesPage() {
  const [activeTab, setActiveTab] = useState<TabId>("services");
  const [searchQuery, setSearchQuery] = useState("");
  const { currentQuarter } = useQuarter();

  // Bekanntmachungen aus Supabase laden
  const [announcements, setAnnouncements] = useState<MunicipalAnnouncement[]>([]);
  const [announcementsLoading, setAnnouncementsLoading] = useState(false);

  useEffect(() => {
    if (activeTab !== "announcements" || !currentQuarter) return;
    let cancelled = false;

    const supabase = createClient();
    const now = new Date().toISOString();

    supabase
      .from("municipal_announcements")
      .select("*")
      .eq("quarter_id", currentQuarter.id)
      .lte("published_at", now)
      .order("pinned", { ascending: false })
      .order("published_at", { ascending: false })
      .then(({ data }) => {
        if (cancelled) return;
        // Client-seitig abgelaufene filtern (expires_at IS NULL oder > now)
        const filtered = (data ?? []).filter(
          (a) => !a.expires_at || new Date(a.expires_at) > new Date()
        );
        setAnnouncements(filtered);
        setAnnouncementsLoading(false);
      });

    return () => { cancelled = true; };
  }, [activeTab, currentQuarter]);

  const tabs: { id: TabId; label: string }[] = [
    { id: "services", label: "Services" },
    { id: "wiki", label: "Hilfe / Wiki" },
    { id: "announcements", label: "Bekanntmachungen" },
  ];

  return (
    <div className="space-y-4 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Link href="/dashboard" className="rounded-full p-1 hover:bg-gray-100">
          <ArrowLeft className="h-5 w-5 text-anthrazit" />
        </Link>
        <h1 className="text-xl font-bold text-anthrazit">Rathaus & Infos</h1>
      </div>

      {/* Tabs */}
      <div className="flex rounded-lg bg-gray-100 p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 rounded-md px-3 py-2 text-xs font-medium transition-all ${
              activeTab === tab.id
                ? "bg-white text-anthrazit shadow-soft"
                : "text-muted-foreground hover:text-anthrazit"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab: Services */}
      {activeTab === "services" && (
        <div className="space-y-4">
          {/* Rathaus-Info-Karte */}
          <div className="rounded-xl bg-gradient-to-r from-blue-50 to-transparent p-4">
            <h2 className="font-semibold text-anthrazit">Rathaus Bad Säckingen</h2>
            <p className="mt-1 text-sm text-muted-foreground">Tel. 07761 51-0</p>
            <p className="text-sm text-muted-foreground">info@bad-saeckingen.de</p>
            <div className="mt-2 text-xs text-muted-foreground">
              <p>Mo: 8–12, 14–16 Uhr</p>
              <p>Di–Mi, Fr: 8–12 Uhr</p>
              <p>Do: 8–12, 14–18 Uhr</p>
            </div>
          </div>

          {/* Quicklinks — Platzhalter */}
          <div className="space-y-3">
            {SERVICE_LINK_CATEGORIES.map((cat) => (
              <div key={cat.id}>
                <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {cat.label}
                </h3>
                <div className="flex flex-col items-center rounded-lg bg-white py-4 shadow-soft">
                  <p className="text-xs text-muted-foreground">Links werden nach DB-Einrichtung geladen.</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: Wiki / FAQ */}
      {activeTab === "wiki" && (
        <div className="space-y-3">
          {/* Suchfeld */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Suche: z.B. Schlagloch, Müll, Parkausweis..."
              className="w-full rounded-lg border bg-white py-2.5 pl-9 pr-3 text-sm text-anthrazit placeholder:text-muted-foreground focus:border-quartier-green focus:outline-none focus:ring-1 focus:ring-quartier-green"
            />
          </div>

          {/* Wiki-Kategorien — Platzhalter */}
          {WIKI_CATEGORIES.map((cat) => (
            <div key={cat.id} className="rounded-lg bg-white p-3 shadow-soft">
              <h3 className="text-sm font-semibold text-anthrazit">{cat.label}</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Einträge werden nach DB-Einrichtung geladen.
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Tab: Bekanntmachungen */}
      {activeTab === "announcements" && (
        <div className="space-y-3">
          {/* Ladezustand */}
          {announcementsLoading && (
            <div className="flex min-h-[100px] items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-3 border-[#4CAF87] border-t-transparent" />
            </div>
          )}

          {/* Bekanntmachungen anzeigen */}
          {!announcementsLoading && announcements.length > 0 && (
            <>
              {announcements.map((a) => {
                const cat = getCategoryConfig(a.category);
                return (
                  <div
                    key={a.id}
                    className="rounded-xl bg-white p-4 shadow-soft animate-fade-in-up"
                  >
                    {/* Badges */}
                    <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                      {a.pinned && (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                          <Pin className="h-3 w-3" /> Angepinnt
                        </span>
                      )}
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-anthrazit">
                        {cat.icon} {cat.label}
                      </span>
                    </div>

                    {/* Titel */}
                    <h3 className="text-sm font-bold text-anthrazit">{a.title}</h3>

                    {/* Text */}
                    {a.body && (
                      <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                        {a.body}
                      </p>
                    )}

                    {/* Footer: Datum + Quelle */}
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-[10px] text-gray-400">
                      <span>{formatDateDE(a.published_at)}</span>
                      {a.source_url && (
                        <a
                          href={a.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-0.5 text-quartier-green hover:underline"
                        >
                          <ExternalLink className="h-3 w-3" /> Quelle
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </>
          )}

          {/* Leerzustand */}
          {!announcementsLoading && announcements.length === 0 && (
            <div className="flex flex-col items-center py-8 text-center">
              <div className="mb-3 text-4xl" aria-hidden="true">📢</div>
              <h2 className="text-lg font-semibold text-anthrazit">Keine Bekanntmachungen</h2>
              <p className="mt-1 max-w-xs text-sm text-muted-foreground">
                Aktuelle Bekanntmachungen für Ihr Quartier erscheinen hier.
              </p>
            </div>
          )}

          {/* Disclaimer */}
          <p className="text-center text-[10px] text-muted-foreground">
            {DISCLAIMERS.announcements}
          </p>
        </div>
      )}
    </div>
  );
}
