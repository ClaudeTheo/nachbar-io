// Nachbar Hilfe — Feature-Gate Logik fuer Abrechnungs-Modul
import type { SubscriptionStatus } from "./types";

export type { SubscriptionStatus };

/**
 * Prueft ob ein Helfer Zugang zu Abrechnungs-Funktionen hat.
 * Zugang: trial (Quittung nicht verbraucht) oder active.
 */
export function canAccessBilling(
  status: SubscriptionStatus,
  trialReceiptUsed: boolean = false,
): boolean {
  if (status === "active") return true;
  if (status === "trial" && !trialReceiptUsed) return true;
  return false;
}

/**
 * Prueft ob der Trial abgelaufen ist (erste Quittung verbraucht).
 */
export function isTrialExpired(
  status: SubscriptionStatus,
  trialReceiptUsed: boolean,
): boolean {
  return status === "trial" && trialReceiptUsed;
}

/**
 * Gibt das deutsche Label fuer den Subscription-Status zurueck.
 */
export function getSubscriptionLabel(status: SubscriptionStatus): string {
  const labels: Record<SubscriptionStatus, string> = {
    free: "Kostenlos",
    trial: "Testphase",
    active: "Abrechnungs-Modul (19,90 EUR/Mo)",
    paused: "Pausiert",
    cancelled: "Gekuendigt",
  };
  return labels[status];
}

/**
 * Prueft ob der Helfer die Paywall sehen sollte.
 */
export function shouldShowPaywall(
  status: SubscriptionStatus,
  trialReceiptUsed: boolean,
): boolean {
  return isTrialExpired(status, trialReceiptUsed) || status === "free";
}
