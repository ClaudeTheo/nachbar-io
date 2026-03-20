"use client";

import { useRouter } from "next/navigation";
import { MapPin, Users } from "lucide-react";
import { CRAFTSMAN_SUBCATEGORIES } from "@/lib/constants";
import { TrustScoreBadge } from "@/components/craftsmen/TrustScoreBadge";
import type { CommunityTip, CraftsmanTrustScore } from "@/lib/supabase/types";

interface CraftsmanCardProps {
  tip: CommunityTip;
  trustScore: CraftsmanTrustScore;
}

// Subcategory-Icon anhand der ID finden
function getSubcategoryIcon(subcategoryId: string): string {
  const sub = CRAFTSMAN_SUBCATEGORIES.find((s) => s.id === subcategoryId);
  return sub?.icon ?? "🔧";
}

export function CraftsmanCard({ tip, trustScore }: CraftsmanCardProps) {
  const router = useRouter();

  // Erstes Gewerk als Icon verwenden
  const primarySubcategory = tip.subcategories?.[0];
  const icon = primarySubcategory ? getSubcategoryIcon(primarySubcategory) : "🔧";

  return (
    <button
      onClick={() => router.push(`/handwerker/${tip.id}`)}
      className="w-full text-left rounded-xl border bg-white p-4 shadow-sm hover:shadow-md transition-shadow min-h-[80px]"
    >
      <div className="flex gap-3">
        {/* Icon */}
        <div className="flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-lg bg-gray-50 text-2xl">
          {icon}
        </div>

        {/* Inhalt */}
        <div className="flex-1 min-w-0 space-y-1.5">
          {/* Name */}
          <h3 className="font-semibold text-base truncate">
            {tip.business_name || tip.title}
          </h3>

          {/* Trust-Score (kompakt) */}
          <TrustScoreBadge score={trustScore} size="sm" showUsageCount />

          {/* Standort + Einzugsgebiet */}
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            {tip.location_hint && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {tip.location_hint}
              </span>
            )}
            {tip.service_area && (
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {tip.service_area}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}
