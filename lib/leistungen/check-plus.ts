// Plus-Gating fuer Leistungen-Info.
// Schema-Quelle: modules/care/services/types.ts
//   CareSubscriptionPlan   = 'free' | 'plus' | 'pro'
//   CareSubscriptionStatus = 'active' | 'trial' | 'cancelled' | 'expired'
// Pro-Abonnenten sehen Plus-Features mit (vgl. PLAN_FEATURES in care/services/constants.ts).

export interface SubscriptionSnapshot {
  plan: string;
  status: string;
  trial_ends_at: string | null;
}

export function hasPlusAccess(sub: SubscriptionSnapshot | null): boolean {
  if (!sub) return false;

  const isPlusTier = sub.plan === "plus" || sub.plan === "pro";
  if (!isPlusTier) return false;

  if (sub.status === "active") return true;

  if (sub.status === "trial") {
    if (!sub.trial_ends_at) return true;
    return new Date(sub.trial_ends_at).getTime() > Date.now();
  }

  return false;
}
