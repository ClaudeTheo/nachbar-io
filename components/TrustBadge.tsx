"use client";

import { Shield, ShieldCheck, Star, Crown } from "lucide-react";
import type { TrustLevel } from "@/lib/supabase/types";

interface TrustBadgeProps {
  level: TrustLevel;
  showLabel?: boolean;
  size?: "sm" | "md";
}

const config: Record<TrustLevel, { label: string; icon: typeof Shield; className: string }> = {
  new: {
    label: "Registriert",
    icon: Shield,
    className: "text-gray-400",
  },
  verified: {
    label: "Verifiziert",
    icon: ShieldCheck,
    className: "text-quartier-green",
  },
  trusted: {
    label: "Vertraut",
    icon: Star,
    className: "text-info-blue",
  },
  admin: {
    label: "Admin",
    icon: Crown,
    className: "text-purple-500",
  },
};

export function TrustBadge({ level, showLabel = false, size = "sm" }: TrustBadgeProps) {
  const { label, icon: Icon, className } = config[level];
  const iconSize = size === "sm" ? "h-4 w-4" : "h-5 w-5";

  return (
    <span
      className={`inline-flex items-center gap-1 ${className}`}
      title={label}
      aria-label={`Vertrauenslevel: ${label}`}
    >
      <Icon className={iconSize} />
      {showLabel && (
        <span className={`font-medium ${size === "sm" ? "text-xs" : "text-sm"}`}>
          {label}
        </span>
      )}
    </span>
  );
}
