"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { CRAFTSMAN_SUBCATEGORIES } from "@/lib/constants";
import { loadCraftsmenList } from "@/lib/craftsmen/hooks";
import { calculateTrustScore } from "@/lib/craftsmen/trust-score";
import { CraftsmanCard } from "@/components/craftsmen/CraftsmanCard";
import { FeatureGate } from "@/components/FeatureGate";
import { createClient } from "@/lib/supabase/client";
import type { CommunityTip, CraftsmanTrustScore } from "@/lib/supabase/types";

const PAGE_SIZE = 20;

// Trust-Scores fuer eine Liste von Handwerkern laden
async function loadTrustScores(
  tips: CommunityTip[]
): Promise<Map<string, CraftsmanTrustScore>> {
  const supabase = createClient();
  const tipIds = tips.map((t) => t.id);
  if (tipIds.length === 0) return new Map();

  // Empfehlungen und Usage-Events parallel laden
  const [recResult, usageResult] = await Promise.all([
    supabase
      .from("craftsman_recommendations")
      .select("tip_id, recommends, confirmed_usage")
      .in("tip_id", tipIds),
    supabase
      .from("craftsman_usage_events")
      .select("tip_id, user_id, used_at")
      .in("tip_id", tipIds),
  ]);

  const recs = recResult.data ?? [];
  const usages = usageResult.data ?? [];

  // Nach tip_id gruppieren
  const scores = new Map<string, CraftsmanTrustScore>();
  for (const tipId of tipIds) {
    const tipRecs = recs.filter((r) => r.tip_id === tipId);
    const tipUsages = usages.filter((u) => u.tip_id === tipId);
    scores.set(tipId, calculateTrustScore({
      recommendations: tipRecs,
      usageEvents: tipUsages,
    }));
  }

  return scores;
}

function HandwerkerContent() {
  const [tips, setTips] = useState<CommunityTip[]>([]);
  const [trustScores, setTrustScores] = useState<Map<string, CraftsmanTrustScore>>(new Map());
  const [filterSubcategory, setFilterSubcategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);

  // Debounce Suchfeld (300ms)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Daten laden
  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const result = await loadCraftsmenList({
          subcategory: filterSubcategory,
          search: debouncedSearch || null,
          page,
          pageSize: PAGE_SIZE,
        });
        setTips(result.data);
        setHasMore(result.hasMore);

        // Trust-Scores berechnen
        const scores = await loadTrustScores(result.data);
        setTrustScores(scores);
      } catch (err) {
        console.error("Handwerker laden fehlgeschlagen:", err);
      }
      setLoading(false);
    }
    load();
  }, [filterSubcategory, debouncedSearch, page]);

  // Filter-Reset bei Suche/Kategorie
  const handleSubcategoryFilter = (subcatId: string) => {
    setFilterSubcategory(filterSubcategory === subcatId ? null : subcatId);
    setPage(0);
  };

  const defaultScore: CraftsmanTrustScore = {
    total_recommendations: 0,
    positive_recommendations: 0,
    weighted_score: 0,
    display_score: 0,
    has_minimum: false,
    total_usage_events: 0,
    last_used_at: null,
    unique_users_count: 0,
  };

  return (
    <div>
      {/* Header */}
      <PageHeader
        title="Handwerker & Betriebe"
        backHref="/dashboard"
        className="mb-4"
        actions={
          <Link
            href="/handwerker/neu"
            className="flex items-center gap-1 rounded-lg bg-quartier-green px-3 py-2 text-sm font-semibold text-white hover:bg-quartier-green-dark"
          >
            <Plus className="h-4 w-4" />
            Handwerker eintragen
          </Link>
        }
      />

      {/* Suchfeld */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }}
          placeholder="Handwerker suchen..."
          className="w-full rounded-lg border border-border bg-white py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-quartier-green/40"
        />
      </div>

      {/* Subcategory-Filter Chips (horizontal scrollbar) */}
      <div className="mb-4 -mx-1 flex gap-2 overflow-x-auto pb-2 scrollbar-hide px-1">
        {CRAFTSMAN_SUBCATEGORIES.map((sub) => (
          <button
            key={sub.id}
            onClick={() => handleSubcategoryFilter(sub.id)}
            className={`flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
              filterSubcategory === sub.id
                ? "bg-quartier-green text-white"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {sub.icon} {sub.label}
          </button>
        ))}
      </div>

      {/* Handwerker-Liste */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : tips.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-muted-foreground">
            {filterSubcategory || debouncedSearch
              ? "Keine Handwerker für diese Suche gefunden."
              : "Noch keine Handwerker eingetragen."}
          </p>
          <p className="mt-1 text-sm text-muted-foreground/70">
            Empfehlen Sie einen Handwerker aus Ihrer Nachbarschaft!
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {tips.map((tip) => (
            <CraftsmanCard
              key={tip.id}
              tip={tip}
              trustScore={trustScores.get(tip.id) ?? defaultScore}
            />
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

export default function HandwerkerPage() {
  return (
    <FeatureGate
      feature="HANDWERKER_PORTAL"
      fallback={
        <div className="py-12 text-center">
          <p className="text-muted-foreground">
            Das Handwerker-Portal ist derzeit nicht verfügbar.
          </p>
        </div>
      }
    >
      <HandwerkerContent />
    </FeatureGate>
  );
}
