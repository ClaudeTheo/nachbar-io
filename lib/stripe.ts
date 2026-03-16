// lib/stripe.ts
// Nachbar.io — Stripe Server-Side Client
// Vier-Versionen-Modell: Free / Plus / Pro Community / Pro Medical
import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  // Nicht werfen — im Pilot-Modus ist Stripe optional
  console.warn('STRIPE_SECRET_KEY nicht konfiguriert — Zahlungen deaktiviert');
}

export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

// --- Plan-Typen ---

export type PlanType = 'free' | 'plus' | 'pro_community' | 'pro_medical';
export type BillingInterval = 'monthly' | 'yearly';

// Abwaertskompatibilitaet fuer bestehende Imports
export type PaidPlan = Exclude<PlanType, 'free'>;
export type BillingCycle = BillingInterval;

// --- Anzeigenamen ---

export const PLAN_DISPLAY_NAMES: Record<PlanType, string> = {
  free: 'Nachbar Free',
  plus: 'Nachbar Plus',
  pro_community: 'Nachbar Pro Community',
  pro_medical: 'Nachbar Pro Medical',
};

// --- Preise in Euro (fuer UI-Anzeige, nicht fuer Stripe-Checkout) ---

export const PLAN_PRICES: Record<Exclude<PlanType, 'free'>, { monthly: number; yearly: number }> = {
  plus: { monthly: 8.90, yearly: 89 },
  pro_community: { monthly: 79, yearly: 790 },
  pro_medical: { monthly: 89, yearly: 890 },
};

// Pro Medical Einzeltermin-Preis (einmalig, kein Abo)
export const PRO_MEDICAL_APPOINTMENT_PRICE = 5;

// --- Stripe Price IDs aus Umgebungsvariablen ---

export const STRIPE_PRICES = {
  plus: {
    monthly: process.env.STRIPE_PRICE_PLUS_MONTHLY!,
    yearly: process.env.STRIPE_PRICE_PLUS_YEARLY!,
  },
  pro_community: {
    monthly: process.env.STRIPE_PRICE_PRO_COMMUNITY_MONTHLY!,
    yearly: process.env.STRIPE_PRICE_PRO_COMMUNITY_YEARLY!,
  },
  pro_medical: {
    monthly: process.env.STRIPE_PRICE_PRO_MEDICAL_MONTHLY!,
    yearly: process.env.STRIPE_PRICE_PRO_MEDICAL_YEARLY!,
    per_appointment: process.env.STRIPE_PRICE_PRO_MEDICAL_APPOINTMENT!,
  },
} as const;

// Hilfsfunktion: Stripe Price ID fuer Plan + Intervall nachschlagen
export function getStripePriceId(plan: PaidPlan, interval: BillingInterval): string | undefined {
  const planPrices = STRIPE_PRICES[plan];
  if (!planPrices) return undefined;
  return planPrices[interval] || undefined;
}
