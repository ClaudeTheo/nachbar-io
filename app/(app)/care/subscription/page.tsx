// app/(app)/care/subscription/page.tsx
'use client';

import { CreditCard } from 'lucide-react';
import { useSubscription } from '@/lib/care/hooks/useSubscription';
import { SubscriptionCard } from '@/components/care/SubscriptionCard';
import { SubscriptionPlans } from '@/components/care/SubscriptionPlans';
import type { CareSubscriptionPlan } from '@/lib/care/types';

export default function SubscriptionPage() {
  const { subscription, changePlan } = useSubscription();

  const currentPlan = (subscription?.plan ?? 'free') as CareSubscriptionPlan;

  return (
    <div className="px-4 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#2D3142] flex items-center gap-2">
          <CreditCard className="h-6 w-6 text-quartier-green" />
          Ihr Abo-Plan
        </h1>
        <p className="text-muted-foreground mt-1">
          Verwalten Sie Ihren Nachbar.io Pflege-Plan.
        </p>
      </div>

      <SubscriptionCard />

      <div>
        <h2 className="text-sm font-medium text-muted-foreground mb-3">Verfuegbare Plaene</h2>
        <SubscriptionPlans currentPlan={currentPlan} onSelectPlan={changePlan} />
      </div>

      {/* Info-Hinweis */}
      <div className="rounded-xl bg-blue-50 p-4 text-sm text-[#2D3142]">
        <p className="font-medium">Hinweis zur Zahlungsabwicklung</p>
        <p className="mt-1 text-muted-foreground">
          Die Zahlungsabwicklung wird in Kuerze verfuegbar sein. Derzeit koennen Sie Ihren Plan kostenfrei aendern und alle Funktionen testen.
        </p>
      </div>
    </div>
  );
}
