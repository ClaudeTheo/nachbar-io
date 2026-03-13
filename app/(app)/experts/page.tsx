"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  Search,
  Star,
  ThumbsUp,
  ChevronRight,
  Shield,
  Filter,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { useQuarter } from "@/lib/quarters";
import { EXPERT_CATEGORIES, SKILL_CATEGORIES, TRUST_LEVELS } from "@/lib/constants";
import type { Skill, User } from "@/lib/supabase/types";

// Aggregiertes Experten-Profil fuer die Liste
interface ExpertListItem {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  trust_level: string;
  created_at: string;
  skills: Skill[];
  avg_rating: number | null;
  review_count: number;
  endorsement_count: number;
}

type SortMode = "rating" | "endorsements" | "reviews";

export default function ExpertsPage() {
  const [experts, setExperts] = useState<ExpertListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("rating");
  const { currentQuarter } = useQuarter();

  useEffect(() => {
    if (!currentQuarter) return;
    async function loadExperts() {
      const supabase = createClient();

      // Alle oeffentlichen Skills laden (mit User-Daten)
      const { data: skillsData } = await supabase
        .from("skills")
        .select("*, user:users(id, display_name, avatar_url, trust_level, created_at)")
        .eq("quarter_id", currentQuarter!.id)
        .eq("is_public", true)
        .order("created_at", { ascending: false });

      if (!skillsData) {
        setLoading(false);
        return;
      }

      // Reviews aggregieren
      const { data: reviewsData } = await supabase
        .from("expert_reviews")
        .select("expert_user_id, rating");

      // Endorsements aggregieren
      const { data: endorsementsData } = await supabase
        .from("expert_endorsements")
        .select("expert_user_id");

      // Review-Aggregate berechnen
      const reviewAgg: Record<string, { total: number; count: number }> = {};
      if (reviewsData) {
        for (const r of reviewsData) {
          if (!reviewAgg[r.expert_user_id]) {
            reviewAgg[r.expert_user_id] = { total: 0, count: 0 };
          }
          reviewAgg[r.expert_user_id].total += r.rating;
          reviewAgg[r.expert_user_id].count += 1;
        }
      }

      // Endorsement-Counts berechnen
      const endorsementCounts: Record<string, number> = {};
      if (endorsementsData) {
        for (const e of endorsementsData) {
          endorsementCounts[e.expert_user_id] = (endorsementCounts[e.expert_user_id] || 0) + 1;
        }
      }

      // Skills nach User gruppieren
      const userMap = new Map<string, ExpertListItem>();
      for (const skill of skillsData) {
        const user = skill.user as unknown as User;
        if (!user) continue;

        if (!userMap.has(user.id)) {
          const agg = reviewAgg[user.id];
          userMap.set(user.id, {
            user_id: user.id,
            display_name: user.display_name,
            avatar_url: user.avatar_url,
            trust_level: user.trust_level,
            created_at: user.created_at,
            skills: [],
            avg_rating: agg ? agg.total / agg.count : null,
            review_count: agg?.count ?? 0,
            endorsement_count: endorsementCounts[user.id] ?? 0,
          });
        }

        userMap.get(user.id)!.skills.push(skill as unknown as Skill);
      }

      setExperts(Array.from(userMap.values()));
      setLoading(false);
    }

    loadExperts();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentQuarter?.id]);

  // Gefilterte und sortierte Experten
  const filteredExperts = useMemo(() => {
    let result = [...experts];

    // Kategorie-Filter
    if (selectedCategory) {
      result = result.filter((e) =>
        e.skills.some((s) => s.category === selectedCategory)
      );
    }

    // Suchfeld
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (e) =>
          e.display_name.toLowerCase().includes(q) ||
          e.skills.some(
            (s) =>
              s.description?.toLowerCase().includes(q) ||
              SKILL_CATEGORIES.find((c) => c.id === s.category)
                ?.label.toLowerCase()
                .includes(q)
          )
      );
    }

    // Sortierung
    result.sort((a, b) => {
      if (sortMode === "rating") {
        return (b.avg_rating ?? 0) - (a.avg_rating ?? 0);
      } else if (sortMode === "endorsements") {
        return b.endorsement_count - a.endorsement_count;
      } else {
        return b.review_count - a.review_count;
      }
    });

    return result;
  }, [experts, selectedCategory, searchQuery, sortMode]);

  return (
    <div className="space-y-5 animate-fade-in-up">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-anthrazit">Lokale Experten</h1>
        <p className="text-sm text-muted-foreground">
          Verifizierte Fachleute aus Ihrer Nachbarschaft
        </p>
      </div>

      {/* Suchfeld */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Experten suchen..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-xl border border-border bg-white py-3 pl-10 pr-4 text-sm focus:border-quartier-green focus:outline-none focus:ring-1 focus:ring-quartier-green"
        />
      </div>

      {/* Kategorie-Filter (horizontal scrollbar) */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
        <button
          onClick={() => setSelectedCategory(null)}
          className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
            selectedCategory === null
              ? "bg-quartier-green text-white shadow-sm"
              : "bg-white text-anthrazit border border-border hover:border-quartier-green"
          }`}
        >
          Alle
        </button>
        {EXPERT_CATEGORIES.filter((c) => c.id !== "other").map((cat) => (
          <button
            key={cat.id}
            onClick={() =>
              setSelectedCategory(selectedCategory === cat.id ? null : cat.id)
            }
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
              selectedCategory === cat.id
                ? "bg-quartier-green text-white shadow-sm"
                : "bg-white text-anthrazit border border-border hover:border-quartier-green"
            }`}
          >
            {cat.icon} {cat.label}
          </button>
        ))}
      </div>

      {/* Sortierung */}
      <div className="flex items-center gap-2">
        <Filter className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Sortieren:</span>
        {[
          { id: "rating" as SortMode, label: "Bewertung" },
          { id: "endorsements" as SortMode, label: "Empfehlungen" },
          { id: "reviews" as SortMode, label: "Bewertungen" },
        ].map((s) => (
          <button
            key={s.id}
            onClick={() => setSortMode(s.id)}
            className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
              sortMode === s.id
                ? "bg-anthrazit text-white"
                : "bg-lightgray text-muted-foreground hover:text-anthrazit"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Experten-Liste */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 rounded-xl animate-shimmer" />
          ))}
        </div>
      ) : filteredExperts.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-muted p-8 text-center">
          <div className="text-4xl mb-3">🔍</div>
          <p className="font-medium text-anthrazit">
            {searchQuery || selectedCategory
              ? "Keine Experten gefunden"
              : "Noch keine Experten registriert"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {searchQuery || selectedCategory
              ? "Versuchen Sie andere Suchbegriffe oder Filter."
              : "Tragen Sie Ihre Kompetenzen unter Profil → Kompetenzen ein."}
          </p>
          {!searchQuery && !selectedCategory && (
            <Link
              href="/profile/skills"
              className="mt-4 inline-flex items-center gap-1 rounded-lg bg-quartier-green px-4 py-2 text-sm font-medium text-white hover:bg-quartier-green-dark transition-colors"
            >
              Kompetenzen eintragen
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3 animate-stagger">
          {filteredExperts.map((expert) => (
            <ExpertCard key={expert.user_id} expert={expert} selectedCategory={selectedCategory} />
          ))}
        </div>
      )}

      {/* Ergebnis-Zaehler */}
      {!loading && filteredExperts.length > 0 && (
        <p className="text-center text-xs text-muted-foreground">
          {filteredExperts.length} {filteredExperts.length === 1 ? "Experte" : "Experten"} gefunden
        </p>
      )}
    </div>
  );
}

// Experten-Karte
function ExpertCard({
  expert,
  selectedCategory,
}: {
  expert: ExpertListItem;
  selectedCategory: string | null;
}) {
  // Relevante Skills anzeigen (gefiltert oder alle)
  const relevantSkills = selectedCategory
    ? expert.skills.filter((s) => s.category === selectedCategory)
    : expert.skills;

  const trustInfo = TRUST_LEVELS[expert.trust_level as keyof typeof TRUST_LEVELS];

  return (
    <Link
      href={`/experts/${expert.user_id}`}
      className="block rounded-xl border border-border bg-white p-4 shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-quartier-green/10 text-lg font-bold text-quartier-green">
          {expert.display_name.charAt(0).toUpperCase()}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-anthrazit truncate">
              {expert.display_name}
            </h3>
            {(expert.trust_level === "verified" ||
              expert.trust_level === "trusted" ||
              expert.trust_level === "admin") && (
              <Shield className="h-4 w-4 text-quartier-green shrink-0" />
            )}
            {trustInfo && (
              <Badge variant="outline" className="text-[10px] shrink-0">
                {trustInfo.label}
              </Badge>
            )}
          </div>

          {/* Skills */}
          <div className="mt-1 flex flex-wrap gap-1">
            {relevantSkills.slice(0, 3).map((skill) => {
              const cat = SKILL_CATEGORIES.find((c) => c.id === skill.category);
              return (
                <span
                  key={skill.id}
                  className="inline-flex items-center gap-0.5 rounded-full bg-lightgray px-2 py-0.5 text-[11px] text-anthrazit"
                >
                  {cat?.icon} {cat?.label ?? skill.category}
                </span>
              );
            })}
            {relevantSkills.length > 3 && (
              <span className="rounded-full bg-lightgray px-2 py-0.5 text-[11px] text-muted-foreground">
                +{relevantSkills.length - 3}
              </span>
            )}
          </div>

          {/* Beschreibung des ersten relevanten Skills */}
          {relevantSkills[0]?.description && (
            <p className="mt-1 text-xs text-muted-foreground line-clamp-1">
              {relevantSkills[0].description}
            </p>
          )}

          {/* Stats */}
          <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
            {expert.avg_rating !== null && (
              <span className="flex items-center gap-0.5">
                <Star className="h-3.5 w-3.5 fill-alert-amber text-alert-amber" />
                <span className="font-medium text-anthrazit">
                  {expert.avg_rating.toFixed(1)}
                </span>
                <span>({expert.review_count})</span>
              </span>
            )}
            {expert.endorsement_count > 0 && (
              <span className="flex items-center gap-0.5">
                <ThumbsUp className="h-3.5 w-3.5 text-quartier-green" />
                <span>{expert.endorsement_count} Empfehlungen</span>
              </span>
            )}
            {expert.avg_rating === null && expert.endorsement_count === 0 && (
              <span className="italic">Noch keine Bewertungen</span>
            )}
          </div>
        </div>

        {/* Pfeil */}
        <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0 mt-3" />
      </div>
    </Link>
  );
}
