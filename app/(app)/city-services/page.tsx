"use client";

import { useState, useEffect } from "react";
import { Search, Pin, ExternalLink as ExternalLinkIcon } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { ExternalLink } from "@/components/ExternalLink";
import { createClient } from "@/lib/supabase/client";
import { useQuarter } from "@/lib/quarters";
import {
  SERVICE_LINK_CATEGORIES,
  WIKI_CATEGORIES,
  ANNOUNCEMENT_CATEGORIES,
  DISCLAIMERS,
  announcementDisclaimer,
} from "@/lib/municipal";
import type {
  MunicipalAnnouncement,
  MunicipalConfig,
  ServiceLink,
  WikiEntry,
  AnnouncementCategory,
} from "@/lib/municipal";

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
  return (
    ANNOUNCEMENT_CATEGORIES.find((c) => c.id === catId) ??
    ANNOUNCEMENT_CATEGORIES[5]
  );
}

export default function CityServicesPage() {
  const [activeTab, setActiveTab] = useState<TabId>("services");
  const [searchQuery, setSearchQuery] = useState("");
  const { currentQuarter } = useQuarter();

  // Kommunale Konfiguration aus Supabase laden
  const [config, setConfig] = useState<MunicipalConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(true);

  useEffect(() => {
    if (!currentQuarter) return;
    let cancelled = false;

    const supabase = createClient();
    supabase
      .from("municipal_config")
      .select("*")
      .eq("quarter_id", currentQuarter.id)
      .single()
      .then(({ data }) => {
        if (cancelled) return;
        setConfig(data);
        setConfigLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [currentQuarter]);

  // Bekanntmachungen aus Supabase laden (stadtweit — Amtsblatt gilt fuer alle Quartiere einer Stadt)
  const [announcements, setAnnouncements] = useState<MunicipalAnnouncement[]>(
    [],
  );
  const [announcementsLoading, setAnnouncementsLoading] = useState(false);

  useEffect(() => {
    if (activeTab !== "announcements" || !currentQuarter) return;
    let cancelled = false;
    setAnnouncementsLoading(true);

    const quarter = currentQuarter;

    async function loadAnnouncements() {
      try {
        const supabase = createClient();
        const now = new Date().toISOString();

        // Quartier-IDs derselben Stadt ermitteln (stadtweit — Amtsblatt gilt fuer alle Quartiere)
        let quarterIds: string[] = [];
        if (quarter.city) {
          const { data: cityQuarters } = await supabase
            .from("quarters")
            .select("id")
            .eq("city", quarter.city);
          quarterIds = (cityQuarters ?? []).map((q) => q.id);
        }
        // Fallback: nur eigenes Quartier falls city leer oder keine Treffer
        if (quarterIds.length === 0) {
          quarterIds = [quarter.id];
        }

        if (cancelled) return;

        const { data } = await supabase
          .from("municipal_announcements")
          .select("*")
          .in("quarter_id", quarterIds)
          .lte("published_at", now)
          .order("pinned", { ascending: false })
          .order("published_at", { ascending: false });

        if (cancelled) return;

        const filtered = (data ?? []).filter(
          (a: MunicipalAnnouncement) =>
            !a.expires_at || new Date(a.expires_at) > new Date(),
        );
        setAnnouncements(filtered);
      } catch (err) {
        console.error(
          "[city-services] Fehler beim Laden der Bekanntmachungen:",
          err,
        );
      } finally {
        if (!cancelled) setAnnouncementsLoading(false);
      }
    }

    loadAnnouncements();

    return () => {
      cancelled = true;
    };
  }, [activeTab, currentQuarter]);

  // Service-Links nach Kategorie gruppieren
  const serviceLinks = (config?.service_links ?? []) as ServiceLink[];
  const linksByCategory = SERVICE_LINK_CATEGORIES.map((cat) => ({
    ...cat,
    links: serviceLinks.filter((l) => l.category === cat.id),
  }));

  // Wiki-Eintraege mit Suchfilter
  const wikiEntries = (config?.wiki_entries ?? []) as WikiEntry[];
  const filteredWiki = searchQuery.trim()
    ? wikiEntries.filter(
        (e) =>
          e.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
          e.answer.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : wikiEntries;
  const wikiByCategory = WIKI_CATEGORIES.map((cat) => ({
    ...cat,
    entries: filteredWiki.filter((e) => e.category === cat.id),
  })).filter((cat) => cat.entries.length > 0);

  const tabs: { id: TabId; label: string }[] = [
    { id: "services", label: "Services" },
    { id: "wiki", label: "Hilfe / Wiki" },
    { id: "announcements", label: "Bekanntmachungen" },
  ];

  return (
    <div className="space-y-4 animate-fade-in-up">
      {/* Header */}
      <PageHeader title="Rathaus & Infos" backHref="/dashboard" />

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
            <h2 className="font-semibold text-anthrazit">
              Rathaus {config?.city_name ?? "Bad Säckingen"}
            </h2>
            {(config?.rathaus_phone ?? "07761 51-0") && (
              <p className="mt-1 text-sm text-muted-foreground">
                Tel.{" "}
                <a
                  href={`tel:${(config?.rathaus_phone ?? "07761 51-0").replace(/\s/g, "")}`}
                  className="text-quartier-green hover:underline"
                >
                  {config?.rathaus_phone ?? "07761 51-0"}
                </a>
              </p>
            )}
            {(config?.rathaus_email ?? "info@bad-saeckingen.de") && (
              <p className="text-sm text-muted-foreground">
                <a
                  href={`mailto:${config?.rathaus_email ?? "info@bad-saeckingen.de"}`}
                  className="text-quartier-green hover:underline"
                >
                  {config?.rathaus_email ?? "info@bad-saeckingen.de"}
                </a>
              </p>
            )}
            {config?.opening_hours &&
            Object.keys(config.opening_hours).length > 0 ? (
              <div className="mt-2 text-xs text-muted-foreground">
                {Object.entries(config.opening_hours).map(([day, hours]) => (
                  <p key={day}>
                    <span className="font-medium capitalize">{day}:</span>{" "}
                    {hours}
                  </p>
                ))}
              </div>
            ) : (
              <div className="mt-2 text-xs text-muted-foreground">
                <p>Mo: 8–12, 14–16 Uhr</p>
                <p>Di–Mi, Fr: 8–12 Uhr</p>
                <p>Do: 8–12, 14–18 Uhr</p>
              </div>
            )}
            {config?.rathaus_url && (
              <ExternalLink
                href={config.rathaus_url}
                title="Rathaus Website"
                className="mt-2 inline-flex items-center gap-1 text-xs text-quartier-green hover:underline"
              >
                <ExternalLinkIcon className="h-3 w-3" /> Website
              </ExternalLink>
            )}
          </div>

          {/* Quicklinks nach Kategorie */}
          {configLoading ? (
            <div className="flex min-h-[100px] items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-3 border-[#4CAF87] border-t-transparent" />
            </div>
          ) : (
            <div className="space-y-3">
              {linksByCategory.map((cat) => (
                <div key={cat.id}>
                  <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {cat.label}
                  </h3>
                  {cat.links.length > 0 ? (
                    <div className="space-y-1">
                      {cat.links.map((link, i) => (
                        <ExternalLink
                          key={`${cat.id}-${i}`}
                          href={link.url}
                          title={link.label}
                          className="flex items-center gap-3 rounded-lg bg-white px-3 py-2.5 shadow-soft transition-colors hover:bg-gray-50"
                        >
                          <ExternalLinkIcon className="h-4 w-4 shrink-0 text-quartier-green" />
                          <span className="text-sm text-anthrazit">
                            {link.label}
                          </span>
                        </ExternalLink>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center rounded-lg bg-white py-4 shadow-soft">
                      <p className="text-xs text-muted-foreground">
                        Keine Links in dieser Kategorie.
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
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

          {/* Wiki-Eintraege nach Kategorie */}
          {configLoading ? (
            <div className="flex min-h-[100px] items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-3 border-[#4CAF87] border-t-transparent" />
            </div>
          ) : wikiByCategory.length > 0 ? (
            wikiByCategory.map((cat) => (
              <div key={cat.id} className="space-y-1.5">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {cat.label}
                </h3>
                {cat.entries.map((entry, i) => (
                  <details
                    key={`${cat.id}-${i}`}
                    className="group rounded-lg bg-white shadow-soft"
                  >
                    <summary className="cursor-pointer px-3 py-2.5 text-sm font-medium text-anthrazit hover:bg-gray-50 rounded-lg list-none flex items-center justify-between">
                      <span>{entry.question}</span>
                      <span className="text-muted-foreground transition-transform group-open:rotate-180">
                        ▾
                      </span>
                    </summary>
                    <div className="px-3 pb-3 pt-0">
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {entry.answer}
                      </p>
                      {entry.links && entry.links.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {entry.links.map((link, j) => (
                            <ExternalLink
                              key={j}
                              href={link.url}
                              title={link.label}
                              className="inline-flex items-center gap-1 rounded-full bg-quartier-green/10 px-2.5 py-1 text-[11px] font-medium text-quartier-green hover:bg-quartier-green/20"
                            >
                              <ExternalLinkIcon className="h-3 w-3" />{" "}
                              {link.label}
                            </ExternalLink>
                          ))}
                        </div>
                      )}
                    </div>
                  </details>
                ))}
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center py-8 text-center">
              <div className="mb-3 text-4xl" aria-hidden="true">
                🔍
              </div>
              <p className="text-sm text-muted-foreground">
                {searchQuery.trim()
                  ? "Keine Einträge gefunden."
                  : "Noch keine Wiki-Einträge vorhanden."}
              </p>
            </div>
          )}
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
                      {a.amtsblatt_issue_id && (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700">
                          📰 Amtsblatt
                        </span>
                      )}
                    </div>

                    {/* Titel */}
                    <h3 className="text-sm font-bold text-anthrazit">
                      {a.title}
                    </h3>

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
                        <ExternalLink
                          href={a.source_url}
                          title="Quelle"
                          className="inline-flex items-center gap-0.5 text-quartier-green hover:underline"
                        >
                          <ExternalLinkIcon className="h-3 w-3" /> Quelle
                        </ExternalLink>
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
              <div className="mb-3 text-4xl" aria-hidden="true">
                📢
              </div>
              <h2 className="text-lg font-semibold text-anthrazit">
                Keine Bekanntmachungen
              </h2>
              <p className="mt-1 max-w-xs text-sm text-muted-foreground">
                Aktuelle Bekanntmachungen für Ihr Quartier erscheinen hier.
              </p>
            </div>
          )}

          {/* Disclaimer + Amtsblatt-Link (dynamisch per Stadt) */}
          <div className="space-y-1 text-center">
            <p className="text-[10px] text-muted-foreground">
              {announcementDisclaimer(config?.city_name)}
            </p>
            {config?.rathaus_url && (
              <ExternalLink
                href={config.rathaus_url}
                title="Rathaus-Website"
                className="inline-flex items-center gap-1 text-[10px] text-quartier-green hover:underline"
              >
                <ExternalLinkIcon className="h-3 w-3" /> Rathaus {config.city_name}
              </ExternalLink>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
