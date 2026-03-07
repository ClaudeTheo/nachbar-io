"use client";

import { REPUTATION_LEVELS } from "@/lib/reputation";

interface ReputationBadgeProps {
  level: number;
  showLabel?: boolean;
  size?: "sm" | "md";
}

// Dezente Reputations-Anzeige
// Getrennt vom TrustBadge (Admin-Level) — zeigt Community-Engagement
export function ReputationBadge({ level, showLabel = false, size = "sm" }: ReputationBadgeProps) {
  const config = REPUTATION_LEVELS.find((l) => l.level === level) ?? REPUTATION_LEVELS[0];
  const iconSize = size === "sm" ? "text-sm" : "text-lg";
  const labelSize = size === "sm" ? "text-xs" : "text-sm";

  return (
    <span
      className={`inline-flex items-center gap-1 ${config.color}`}
      title={config.name}
      aria-label={`Reputation: ${config.name}`}
    >
      <span className={iconSize}>{config.icon}</span>
      {showLabel && (
        <span className={`font-medium ${labelSize}`}>
          {config.name}
        </span>
      )}
    </span>
  );
}
