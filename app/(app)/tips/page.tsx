"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, ChevronRight, Filter, CircleCheckBig } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { TIP_CATEGORIES } from "@/lib/constants";
import type { CommunityTip } from "@/lib/supabase/types";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";

const TIPS_PER_PAGE = 20;

export default function TipsPage() {
  const [tips, setTips] = useState<CommunityTip[]>([]);
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [showFilter, setShowFilter] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const supabase = createClient();
      let query = supabase
        .from("community_tips")
        .select("*, user:users(display_name, avatar_url)")
        .eq("status", "active")
        .neq("category", "craftsmen")
        .order("created_at", { ascending: false })
        .range(page * TIPS_PER_PAGE, (page + 1) * TIPS_PER_PAGE);

      if (filterCategory) {
        query = query.eq("category", filterCategory);
      }

      const { data } = await query;
      if (data) {
        setTips(data as unknown as CommunityTip[]);
        setHasMore(data.length > TIPS_PER_PAGE);
      }
      setLoading(false);
    }
    load();
  }, [filterCategory, page]);

  return (
    <div>
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-anthrazit">Nachbarschafts-Tipps</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilter(!showFilter)}
            className={`rounded-lg p-2 transition-colors ${
              filterCategory ? "bg-quartier-green/10 text-quartier-green" : "hover:bg-muted"
            }`}
            aria-label="Filter"
          >
            <Filter className="h-4 w-4" />
          </button>
          <Link
            href="/tips/new"
            className="flex items-center gap-1 rounded-lg bg-quartier-green px-3 py-2 text-sm font-semibold text-white hover:bg-quartier-green-dark"
          >
            <Plus className="h-4 w-4" />
            Tipp teilen
          </Link>
        </div>
      </div>

      {/* Beschreibung */}
      <p className="mb-4 text-sm text-muted-foreground">
        Empfehlungen aus der Nachbarschaft — Handwerker, Ärzte, Geschäfte und mehr.
        Sachlich und kooperativ.
      </p>

      {/* Kategorie-Filter */}
      {showFilter && (
        <div className="mb-4 flex flex-wrap gap-2">
          <button
            onClick={() => { setFilterCategory(null); setPage(0); }}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              !filterCategory
                ? "bg-quartier-green text-white"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            Alle
          </button>
          {TIP_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => { setFilterCategory(filterCategory === cat.id ? null : cat.id); setPage(0); }}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                filterCategory === cat.id
                  ? "bg-quartier-green text-white"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {cat.icon} {cat.label}
            </button>
          ))}
        </div>
      )}

      {/* Verweis auf Handwerker-Portal */}
      <Link
        href="/handwerker"
        className="mb-4 flex items-center gap-2 rounded-lg border border-quartier-green/20 bg-quartier-green/5 p-3 text-sm text-quartier-green hover:bg-quartier-green/10"
      >
        🔧 Handwerker-Empfehlungen finden Sie jetzt im neuen Handwerker-Portal
        <ChevronRight className="h-4 w-4 ml-auto" />
      </Link>

      {/* Tipps-Liste */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : tips.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-muted-foreground">
            {filterCategory ? "Keine Tipps in dieser Kategorie." : "Noch keine Tipps vorhanden."}
          </p>
          <p className="mt-1 text-sm text-muted-foreground/70">
            Teilen Sie Ihre erste Empfehlung mit der Nachbarschaft!
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {tips.map((tip) => (
            <TipCard key={tip.id} tip={tip} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {(page > 0 || hasMore) && (
        <div className="mt-6 flex items-center justify-center gap-4">
          {page > 0 && (
            <button
              onClick={() => setPage(page - 1)}
              className="rounded-lg px-4 py-2 text-sm font-medium text-quartier-green hover:bg-quartier-green/10"
            >
              Zurück
            </button>
          )}
          <span className="text-xs text-muted-foreground">Seite {page + 1}</span>
          {hasMore && (
            <button
              onClick={() => setPage(page + 1)}
              className="rounded-lg px-4 py-2 text-sm font-medium text-quartier-green hover:bg-quartier-green/10"
            >
              Weiter
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function TipCard({ tip }: { tip: CommunityTip }) {
  const router = useRouter();
  const cat = TIP_CATEGORIES.find((c) => c.id === tip.category);
  const timeAgo = formatDistanceToNow(new Date(tip.created_at), {
    addSuffix: true,
    locale: de,
  });

  return (
    <button
      onClick={() => router.push(`/tips/${tip.id}`)}
      className="w-full rounded-lg border border-border bg-white p-4 shadow-sm text-left transition-all hover:border-quartier-green hover:shadow-md active:scale-[0.99]"
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl">{cat?.icon ?? "💡"}</span>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-anthrazit truncate">{tip.title}</h3>
          {tip.business_name && (
            <p className="text-sm font-medium text-quartier-green">{tip.business_name}</p>
          )}
          <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
            {tip.description}
          </p>
          <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
            <span>{tip.user?.display_name ?? "Nachbar"}</span>
            <span>·</span>
            <span>{timeAgo}</span>
            {tip.confirmation_count > 0 && (
              <>
                <span>·</span>
                <span className="flex items-center gap-1 text-quartier-green">
                  <CircleCheckBig className="h-3 w-3" />
                  {tip.confirmation_count} bestätigt
                </span>
              </>
            )}
          </div>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground mt-1" />
      </div>
    </button>
  );
}
