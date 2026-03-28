"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { isUxRedesignEnabled } from "@/lib/ux-flags";
import type { Alert, NewsItem, HelpRequest, MarketplaceItem } from "@/lib/supabase/types";

// Section-Header Hilfskomponente (intern)
function SectionHeader({ title, href }: { title: string; href: string }) {
  return (
    <div className="mb-2 flex items-center justify-between px-4">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-[#2D3142]/40">
        {title}
      </h2>
      <Link
        href={href}
        className="flex items-center text-xs font-semibold text-quartier-green hover:underline"
      >
        Alle <ChevronRight className="h-3 w-3" />
      </Link>
    </div>
  );
}

// Discover-Grid Link-Element
function DiscoverLink({ href, emoji, label }: { href: string; emoji: string; label: string }) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-1 card-interactive rounded-lg bg-white p-3 shadow-soft"
    >
      <span className="text-2xl" aria-hidden="true">
        {emoji}
      </span>
      <span className="text-xs font-medium text-anthrazit">
        {label}
      </span>
    </Link>
  );
}

// Leer-Zustand mit Demo-Vorschau (nur ohne UX-Redesign)
export function EmptyState({
  alerts,
  news,
  helpRequests,
  marketplaceItems,
  quarterName,
}: {
  alerts: Alert[];
  news: NewsItem[];
  helpRequests: HelpRequest[];
  marketplaceItems: MarketplaceItem[];
  quarterName?: string;
}) {
  if (isUxRedesignEnabled("UX_REDESIGN_DASHBOARD")) return null;
  if (alerts.length > 0 || news.length > 0 || helpRequests.length > 0 || marketplaceItems.length > 0) return null;

  return (
    <div className="space-y-4">
      <div className="py-6 text-center">
        <div className="mb-3 text-5xl" aria-hidden="true">
          🏘️
        </div>
        <h2 className="text-lg font-semibold text-anthrazit">
          Willkommen in Ihrem Quartier
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {quarterName ?? "Ihr Quartier"}
        </p>
      </div>

      {/* Demo-News als Vorschau */}
      <section>
        <SectionHeader title="Quartiersnews" href="/news" />
        <div className="space-y-2">
          <div className="rounded-lg bg-white p-3 shadow-soft">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span aria-hidden="true">🏗️</span>
              <span>Infrastruktur</span>
              <span>·</span>
              <span>Heute</span>
            </div>
            <p className="mt-1 font-medium text-anthrazit">
              Kanalarbeiten in Ihrem Quartier ab Montag
            </p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Halbseitige Sperrung für ca. 3 Tage.
            </p>
          </div>
          <div className="rounded-lg bg-white p-3 shadow-soft">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span aria-hidden="true">♻️</span>
              <span>Abfallwirtschaft</span>
              <span>·</span>
              <span>Gestern</span>
            </div>
            <p className="mt-1 font-medium text-anthrazit">
              Gelber Sack: Nächste Abholung Donnerstag
            </p>
          </div>
        </div>
      </section>

      {/* Schnelleinstieg */}
      <section>
        <h2 className="mb-2 font-semibold text-anthrazit">
          Entdecken
        </h2>
        <div className="grid grid-cols-4 gap-2">
          <DiscoverLink href="/board" emoji="📌" label="Brett" />
          <DiscoverLink href="/whohas" emoji="🔍" label="Wer hat?" />
          <DiscoverLink href="/noise" emoji="🔨" label="Lärm" />
          <DiscoverLink href="/map" emoji="🗺️" label="Karte" />
          <DiscoverLink href="/help" emoji="🤝" label="Hilfe" />
          <DiscoverLink href="/marketplace" emoji="🛒" label="Marktplatz" />
          <DiscoverLink href="/events" emoji="📅" label="Events" />
          <DiscoverLink href="/messages" emoji="💬" label="Chat" />
          <DiscoverLink href="/reports" emoji="🔧" label="Mängel" />
          <DiscoverLink href="/waste-calendar" emoji="🗑️" label="Kalender" />
          <DiscoverLink href="/city-services" emoji="🏛️" label="Rathaus" />
          <DiscoverLink href="/lost-found" emoji="📎" label="Fundbüro" />
          <DiscoverLink href="/experts" emoji="⭐" label="Experten" />
          <DiscoverLink href="/tips" emoji="💡" label="Tipps" />
          <DiscoverLink href="/handwerker" emoji="🔧" label="Handwerker" />
          <DiscoverLink href="/care/shopping" emoji="🛒" label="Einkaufshilfe" />
          <DiscoverLink href="/care/tasks" emoji="📋" label="Aufgabentafel" />
          <DiscoverLink href="/sprechstunde" emoji="🩺" label="Sprechstunde" />
        </div>
      </section>
    </div>
  );
}
