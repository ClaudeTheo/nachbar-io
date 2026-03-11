// components/care/SubscriptionPlans.tsx
// Nachbar.io — Plan-Vergleich und Upgrade
'use client';

import { useState } from 'react';
import { Check, X, Star, Loader2 } from 'lucide-react';
import { PLAN_HIERARCHY, PLAN_METADATA, FEATURE_LABELS } from '@/lib/care/billing';
import { PLAN_FEATURES } from '@/lib/care/constants';
import type { CareSubscriptionPlan } from '@/lib/care/types';

// Alle Features in Anzeige-Reihenfolge
const ALL_FEATURES = [
  'checkin', 'medical_emergency_sos', 'sos_all', 'medications', 'appointments',
  'relative_dashboard', 'reports', 'audit_log', 'multi_senior', 'care_dashboard',
  'care_aid_forms', 'sim_fallback', 'sms_notifications', 'voice_notifications', 'priority_support',
];

interface SubscriptionPlansProps {
  currentPlan?: CareSubscriptionPlan;
  onSelectPlan?: (plan: CareSubscriptionPlan) => Promise<boolean>;
}

export function SubscriptionPlans({ currentPlan = 'free', onSelectPlan }: SubscriptionPlansProps) {
  const [changingPlan, setChangingPlan] = useState<CareSubscriptionPlan | null>(null);

  async function handleSelect(plan: CareSubscriptionPlan) {
    if (plan === currentPlan || !onSelectPlan) return;
    setChangingPlan(plan);
    await onSelectPlan(plan);
    setChangingPlan(null);
  }

  return (
    <div className="space-y-4">
      {/* Mobile: Karten-Layout */}
      <div className="space-y-3">
        {PLAN_HIERARCHY.map(plan => {
          const meta = PLAN_METADATA[plan];
          const features = PLAN_FEATURES[plan] ?? [];
          const isCurrent = plan === currentPlan;
          const isChanging = changingPlan === plan;

          return (
            <div
              key={plan}
              className={`rounded-xl border p-4 ${isCurrent ? 'border-[#4CAF87] bg-[#4CAF87]/5' : meta.highlighted ? 'border-blue-300 bg-blue-50/30' : 'bg-card'}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-[#2D3142]">{meta.label}</h3>
                    {isCurrent && (
                      <span className="rounded-full bg-[#4CAF87]/10 px-2 py-0.5 text-xs font-medium text-[#4CAF87]">
                        Aktuell
                      </span>
                    )}
                    {meta.highlighted && !isCurrent && (
                      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 flex items-center gap-1">
                        <Star className="h-3 w-3" /> Empfohlen
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{meta.description}</p>
                </div>
                <span className="text-sm font-semibold text-[#2D3142]">{meta.price}</span>
              </div>

              {/* Features */}
              <div className="space-y-1 mb-3">
                {ALL_FEATURES.map(f => {
                  const hasIt = features.includes(f);
                  return (
                    <div key={f} className="flex items-center gap-1.5 text-xs">
                      {hasIt ? (
                        <Check className="h-3.5 w-3.5 text-[#4CAF87] shrink-0" />
                      ) : (
                        <X className="h-3.5 w-3.5 text-gray-300 shrink-0" />
                      )}
                      <span className={hasIt ? 'text-[#2D3142]' : 'text-gray-400'}>
                        {FEATURE_LABELS[f] ?? f}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Button */}
              <button
                onClick={() => handleSelect(plan)}
                disabled={isCurrent || isChanging}
                className={`w-full rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  isCurrent
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-[#2D3142] text-white hover:bg-[#2D3142]/90 disabled:opacity-50'
                } flex items-center justify-center gap-2`}
              >
                {isChanging ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Wird geaendert...</>
                ) : isCurrent ? (
                  'Aktueller Plan'
                ) : (
                  'Auswaehlen'
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
