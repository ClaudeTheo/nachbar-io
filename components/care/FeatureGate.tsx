// components/care/FeatureGate.tsx
// Nachbar.io — Feature-Gate UI-Komponente
'use client';

import type { ReactNode } from 'react';
import { Lock } from 'lucide-react';
import Link from 'next/link';
import { useSubscription } from '@/lib/care/hooks/useSubscription';
import { hasFeature } from '@/lib/care/constants';
import { FEATURE_LABELS, minimumPlanForFeature, PLAN_METADATA } from '@/lib/care/billing';
import type { CareSubscriptionPlan } from '@/lib/care/types';

interface FeatureGateProps {
  feature: string;
  children: ReactNode;
}

/**
 * Zeigt children nur wenn das Feature im aktuellen Abo verfuegbar ist.
 * Sonst: Upgrade-Hinweis mit Link zur Abo-Seite.
 */
export function FeatureGate({ feature, children }: FeatureGateProps) {
  const { subscription, loading } = useSubscription();

  if (loading) {
    return <div className="animate-pulse rounded-xl border bg-card p-6 h-24" />;
  }

  const currentPlan = (subscription?.plan ?? 'free') as CareSubscriptionPlan;
  const isAvailable = hasFeature(currentPlan, feature);

  if (isAvailable) {
    return <>{children}</>;
  }

  const featureLabel = FEATURE_LABELS[feature] ?? feature;
  const requiredPlan = minimumPlanForFeature(feature);
  const planLabel = requiredPlan ? PLAN_METADATA[requiredPlan]?.label : null;

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-6 text-center">
      <Lock className="mx-auto h-8 w-8 text-amber-500 mb-3" />
      <h3 className="text-sm font-semibold text-[#2D3142] mb-1">
        {featureLabel}
      </h3>
      <p className="text-xs text-muted-foreground mb-3">
        Diese Funktion ist in Ihrem aktuellen Plan nicht verfuegbar.
        {planLabel && ` Verfuegbar ab dem Plan "${planLabel}".`}
      </p>
      <Link
        href="/care/subscription"
        className="inline-flex items-center rounded-lg bg-[#2D3142] px-4 py-2 text-sm font-medium text-white hover:bg-[#2D3142]/90"
      >
        Plan upgraden
      </Link>
    </div>
  );
}
