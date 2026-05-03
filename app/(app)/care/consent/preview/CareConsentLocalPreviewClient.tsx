"use client";

import { useState } from "react";
import { Shield } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { CareConsentNotice } from "@/modules/care/components/consent/CareConsentNotice";
import { ConsentFeatureCard } from "@/modules/care/components/consent/ConsentFeatureCard";
import {
  CARE_CONSENT_DESCRIPTIONS,
  CARE_CONSENT_FEATURES,
  CARE_CONSENT_LABELS,
} from "@/lib/care/constants";
import type { CareConsentFeature } from "@/lib/care/types";

export function CareConsentLocalPreviewClient() {
  const [features, setFeatures] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const feature of CARE_CONSENT_FEATURES) initial[feature] = false;
    return initial;
  });

  function handleToggle(feature: CareConsentFeature, value: boolean) {
    setFeatures((prev) => ({ ...prev, [feature]: value }));
  }

  return (
    <div className="mx-auto max-w-lg space-y-6 px-4 py-6">
      <PageHeader
        title={
          <>
            <Shield className="h-6 w-6 text-quartier-green" />{" "}
            Datenschutz-Einwilligungen
          </>
        }
        subtitle="Care-Modul — Gesundheitsdaten"
        backHref="/care/preview"
      />

      <CareConsentNotice />

      <div className="space-y-3">
        {CARE_CONSENT_FEATURES.map((feature) => (
          <ConsentFeatureCard
            key={feature}
            feature={feature}
            label={CARE_CONSENT_LABELS[feature]}
            description={CARE_CONSENT_DESCRIPTIONS[feature]}
            granted={features[feature] ?? false}
            disabled={false}
            onChange={handleToggle}
          />
        ))}
      </div>
    </div>
  );
}
