// Nachbar Hilfe — Stripe Integration fuer Abrechnungs-Modul (19,90 EUR/Mo)
import Stripe from "stripe";

export const HILFE_SUBSCRIPTION_AMOUNT_CENTS = 1990;

let stripeClient: Stripe | null = null;

export function getStripe(): Stripe | null {
  if (!process.env.STRIPE_SECRET_KEY) {
    console.warn("[hilfe-stripe] STRIPE_SECRET_KEY nicht konfiguriert");
    return null;
  }
  if (!stripeClient) {
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return stripeClient;
}

/**
 * Formatiert Cent-Betrag als EUR-String (deutsch).
 */
export function formatEuroCents(cents: number): string {
  const euros = Math.floor(cents / 100);
  const rest = cents % 100;
  return `${euros},${rest.toString().padStart(2, "0")} EUR`;
}
