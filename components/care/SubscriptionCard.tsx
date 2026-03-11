// components/care/SubscriptionCard.tsx
// Nachbar.io — Aktuelle Abo-Karte
'use client';

import { CreditCard, Check } from 'lucide-react';
import { useSubscription } from '@/lib/care/hooks/useSubscription';
import { PLAN_METADATA, FEATURE_LABELS, trialDaysRemaining } from '@/lib/care/billing';
import { PLAN_FEATURES } from '@/lib/care/constants';
import type { CareSubscriptionPlan, CareSubscriptionStatus } from '@/lib/care/types';

const STATUS_STYLES: Record<CareSubscriptionStatus, { bg: string; text: string; label: string }> = {
  active: { bg: 'bg-green-50', text: 'text-green-700', label: 'Aktiv' },
  trial: { bg: 'bg-blue-50', text: 'text-blue-700', label: 'Testphase' },
  cancelled: { bg: 'bg-amber-50', text: 'text-amber-700', label: 'Gekuendigt' },
  expired: { bg: 'bg-red-50', text: 'text-red-700', label: 'Abgelaufen' },
};

export function SubscriptionCard() {
  const { subscription, loading } = useSubscription();

  if (loading) {
    return <div className="animate-pulse rounded-xl border bg-card p-6 h-40" />;
  }

  const plan = (subscription?.plan ?? 'free') as CareSubscriptionPlan;
  const status = (subscription?.status ?? 'active') as CareSubscriptionStatus;
  const meta = PLAN_METADATA[plan];
  const statusStyle = STATUS_STYLES[status];
  const features = PLAN_FEATURES[plan] ?? [];
  const trialDays = subscription?.trial_ends_at ? trialDaysRemaining(subscription.trial_ends_at) : 0;

  return (
    <div className="rounded-xl border bg-card p-6">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-quartier-green/10 p-2">
            <CreditCard className="h-5 w-5 text-quartier-green" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-[#2D3142]">{meta.label}</h3>
            <p className="text-sm text-muted-foreground">{meta.description}</p>
          </div>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusStyle.bg} ${statusStyle.text}`}>
          {statusStyle.label}
        </span>
      </div>

      {status === 'trial' && trialDays > 0 && (
        <div className="mt-3 rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-700">
          Testphase: noch {trialDays} {trialDays === 1 ? 'Tag' : 'Tage'} verbleibend
        </div>
      )}

      <div className="mt-4">
        <p className="text-xs font-medium text-muted-foreground mb-2">Enthaltene Funktionen:</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
          {features.map(f => (
            <div key={f} className="flex items-center gap-1.5 text-xs text-[#2D3142]">
              <Check className="h-3.5 w-3.5 text-quartier-green shrink-0" />
              {FEATURE_LABELS[f] ?? f}
            </div>
          ))}
        </div>
      </div>

      {subscription?.current_period_end && (
        <p className="mt-4 text-xs text-muted-foreground">
          Aktueller Zeitraum bis: {new Date(subscription.current_period_end).toLocaleDateString('de-DE')}
        </p>
      )}
    </div>
  );
}
