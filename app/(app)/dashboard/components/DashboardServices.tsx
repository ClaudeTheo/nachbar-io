"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { isUxRedesignEnabled } from "@/lib/ux-flags";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { DiscoverGrid } from "@/components/dashboard/DiscoverGrid";
import { HelpRequestsSection } from "@/components/dashboard/help-requests-section";
import { CaregiverDashboard } from "@/modules/care/components/caregiver/CaregiverDashboard";
import { FeatureGate } from "@/components/FeatureGate";
import { QuartierServicesSection } from "@/components/municipal/QuartierServicesSection";
import { Badge } from "@/components/ui/badge";
import { NewsCard } from "@/components/NewsCard";
import type {
  HelpRequest,
  MarketplaceItem,
  NewsItem,
} from "@/lib/supabase/types";

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

// Marktplatz-Sektion
function MarketplaceSection({ items }: { items: MarketplaceItem[] }) {
  if (items.length === 0) return null;

  return (
    <section>
      <SectionHeader title="Marktplatz" href="/marketplace" />
      <div className="divide-y divide-[#ebe5dd]">
        {items.map((item) => (
          <Link
            key={item.id}
            href={`/marketplace/${item.id}`}
            className="flex items-center justify-between px-4 py-4 transition-colors active:bg-[#f5f0eb]"
          >
            <div>
              <p className="font-medium text-anthrazit">{item.title}</p>
              <p className="text-xs text-muted-foreground">
                {item.user?.display_name} ·{" "}
                {item.price ? `${item.price} €` : "Geschenkt"}
              </p>
            </div>
            <Badge variant="secondary">
              {item.type === "give"
                ? "Geschenkt"
                : item.type === "lend"
                  ? "Leihen"
                  : "Kaufen"}
            </Badge>
          </Link>
        ))}
      </div>
    </section>
  );
}

// Quartiersnews-Sektion
function NewsFeedSection({ news }: { news: NewsItem[] }) {
  if (news.length === 0) return null;

  return (
    <section>
      <SectionHeader title="Quartiersnews" href="/news" />
      <div className="divide-y divide-[#ebe5dd]">
        {news.map((item) => (
          <NewsCard key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}

// Alle Service-Sektionen: Kommunal, Hilfe-Boerse, Marktplatz, News, Caregiver, QuickActions
export function DashboardServices({
  helpRequests,
  marketplaceItems,
  news,
}: {
  helpRequests: HelpRequest[];
  marketplaceItems: MarketplaceItem[];
  news: NewsItem[];
}) {
  return (
    <>
      {/* Quartier-Services (Kommunal-Modul) — hinter Feature-Flag */}
      <FeatureGate feature="KOMMUNAL_MODULE">
        <QuartierServicesSection />
      </FeatureGate>

      {/* Hilfe-Boerse — nur letzte 24h, wegwischbar */}
      {helpRequests.length > 0 && (
        <HelpRequestsSection requests={helpRequests} />
      )}

      {/* Marktplatz */}
      <MarketplaceSection items={marketplaceItems} />

      {/* Quartiersnews */}
      <NewsFeedSection news={news} />

      {/* Angehoerigen-Dashboard (Caregiver/Plus) */}
      <CaregiverDashboard />

      {/* UX-Redesign: QuickActions + DiscoverGrid */}
      {isUxRedesignEnabled("UX_REDESIGN_DASHBOARD") && (
        <>
          <QuickActions />
          <DiscoverGrid />
        </>
      )}
    </>
  );
}
