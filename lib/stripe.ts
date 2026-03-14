// lib/stripe.ts
// Nachbar.io — Stripe Server-Side Client
import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  // Nicht werfen — im Pilot-Modus ist Stripe optional
  console.warn('STRIPE_SECRET_KEY nicht konfiguriert — Zahlungen deaktiviert');
}

export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

// Stripe Price IDs aus Umgebungsvariablen
export const STRIPE_PRICES = {
  plus_monthly: process.env.STRIPE_PRICE_PLUS_MONTHLY || '',
  plus_yearly: process.env.STRIPE_PRICE_PLUS_YEARLY || '',
  pro_monthly: process.env.STRIPE_PRICE_PRO_MONTHLY || '',
  pro_yearly: process.env.STRIPE_PRICE_PRO_YEARLY || '',
} as const;

export type BillingCycle = 'monthly' | 'yearly';
export type PaidPlan = 'plus' | 'pro';
