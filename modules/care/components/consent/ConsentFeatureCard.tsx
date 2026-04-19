// components/care/ConsentFeatureCard.tsx
"use client";

import { Shield, Heart, Pill, FileText, Phone, Sparkles } from "lucide-react";
import type { CareConsentFeature } from "@/lib/care/types";

const FEATURE_ICONS: Record<CareConsentFeature, React.ElementType> = {
  sos: Shield,
  checkin: Heart,
  medications: Pill,
  care_profile: FileText,
  emergency_contacts: Phone,
  ai_onboarding: Sparkles,
};

interface Props {
  feature: CareConsentFeature;
  label: string;
  description: string;
  granted: boolean;
  disabled: boolean;
  onChange: (feature: CareConsentFeature, value: boolean) => void;
}

export function ConsentFeatureCard({
  feature,
  label,
  description,
  granted,
  disabled,
  onChange,
}: Props) {
  const Icon = FEATURE_ICONS[feature];

  return (
    <label
      className={`flex items-center gap-4 rounded-2xl border-2 p-4 cursor-pointer transition-colors ${
        granted
          ? "border-quartier-green bg-quartier-green/5"
          : "border-border bg-white"
      } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      <Icon
        className={`h-8 w-8 flex-shrink-0 ${granted ? "text-quartier-green" : "text-muted-foreground"}`}
      />
      <div className="flex-1 min-w-0">
        <p className="text-lg font-semibold text-anthrazit">{label}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <input
        type="checkbox"
        checked={granted}
        disabled={disabled}
        onChange={(e) => onChange(feature, e.target.checked)}
        className="h-6 w-6 rounded accent-quartier-green flex-shrink-0"
        aria-label={`Einwilligung für ${label}`}
      />
    </label>
  );
}
