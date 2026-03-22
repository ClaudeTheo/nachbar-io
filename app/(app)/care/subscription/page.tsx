// app/(app)/care/subscription/page.tsx
'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { CreditCard, CircleCheckBig, CircleX, Gift } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { useSubscription } from '@/lib/care/hooks/useSubscription';
import { SubscriptionCard } from '@/components/care/SubscriptionCard';
import { SubscriptionPlans } from '@/components/care/SubscriptionPlans';
import type { CareSubscriptionPlan } from '@/lib/care/types';

function SubscriptionContent() {
  const { subscription, changePlan } = useSubscription();
  const searchParams = useSearchParams();
  const checkout = searchParams.get('checkout');

  const currentPlan = (subscription?.plan ?? 'free') as CareSubscriptionPlan;

  return (
    <div className="px-4 py-6 space-y-6">
      <PageHeader
        title={<><CreditCard className="h-6 w-6 text-quartier-green" /> Ihr Abo-Plan</>}
        subtitle="Verwalten Sie Ihren QuartierApp Pflege-Plan."
        backHref="/care"
      />

      {/* Checkout-Feedback */}
      {checkout === 'success' && (
        <div className="rounded-xl bg-green-50 border border-green-200 p-4 text-sm text-[#2D3142] flex items-start gap-3">
          <CircleCheckBig className="h-5 w-5 text-[#4CAF87] shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Zahlung erfolgreich!</p>
            <p className="mt-1 text-muted-foreground">
              Ihr Abo wurde aktiviert. Alle Funktionen stehen Ihnen ab sofort zur Verfuegung.
            </p>
          </div>
        </div>
      )}
      {checkout === 'cancelled' && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm text-[#2D3142] flex items-start gap-3">
          <CircleX className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Zahlung abgebrochen</p>
            <p className="mt-1 text-muted-foreground">
              Die Zahlung wurde nicht abgeschlossen. Sie koennen es jederzeit erneut versuchen.
            </p>
          </div>
        </div>
      )}

      <SubscriptionCard />

      {/* Early-Adopter-Hinweis */}
      <div className="rounded-xl bg-[#4CAF87]/5 border border-[#4CAF87]/20 p-4 text-sm text-[#2D3142] flex items-start gap-3">
        <Gift className="h-5 w-5 text-[#4CAF87] shrink-0 mt-0.5" />
        <div>
          <p className="font-medium">Early-Adopter-Aktion</p>
          <p className="mt-1 text-muted-foreground">
            Die ersten 200 Nutzer erhalten alle Funktionen kostenlos — als Dankeschoen fuer Ihre fruehe Unterstuetzung.
          </p>
        </div>
      </div>

      <div>
        <h2 className="text-sm font-medium text-muted-foreground mb-3">Verfuegbare Plaene</h2>
        <SubscriptionPlans currentPlan={currentPlan} onSelectPlan={changePlan} />
      </div>
    </div>
  );
}

export default function SubscriptionPage() {
  return (
    <Suspense fallback={<div className="px-4 py-6 text-muted-foreground">Laden...</div>}>
      <SubscriptionContent />
    </Suspense>
  );
}
