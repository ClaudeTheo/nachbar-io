"use client";

import { CircleCheckBig, Clock, Users } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";
import { formatTrustDisplay } from "@/lib/craftsmen/trust-score";
import type { CraftsmanTrustScore } from "@/lib/supabase/types";

interface TrustScoreBadgeProps {
  score: CraftsmanTrustScore;
  showRecency?: boolean;
  showUsageCount?: boolean;
  size?: "sm" | "md";
}

// Farben je nach Trust-Variant
const VARIANT_STYLES = {
  positive: "bg-quartier-green/10 text-quartier-green border-quartier-green/20",
  neutral: "bg-amber-50 text-amber-700 border-amber-200",
  low: "bg-gray-50 text-gray-500 border-gray-200",
  muted: "bg-muted text-muted-foreground border-border",
} as const;

export function TrustScoreBadge({ score, showRecency, showUsageCount, size = "md" }: TrustScoreBadgeProps) {
  const display = formatTrustDisplay(score);
  const styles = VARIANT_STYLES[display.variant];
  const textSize = size === "sm" ? "text-xs" : "text-sm";

  return (
    <div className="space-y-1">
      {/* Haupt-Badge */}
      <div className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 ${textSize} font-medium ${styles}`}>
        <CircleCheckBig className={size === "sm" ? "h-3 w-3" : "h-4 w-4"} />
        {display.label}
      </div>

      {/* Zusatz-Signale (nur bei genuegend Bewertungen) */}
      {score.has_minimum && (
        <div className="flex flex-wrap gap-2">
          {showRecency && score.last_used_at && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              Zuletzt beauftragt {formatDistanceToNow(new Date(score.last_used_at), {
                addSuffix: true,
                locale: de,
              })}
            </span>
          )}
          {showUsageCount && score.total_usage_events > 0 && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Users className="h-3 w-3" />
              {score.total_usage_events}× beauftragt
            </span>
          )}
        </div>
      )}
    </div>
  );
}
