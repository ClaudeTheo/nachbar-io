// lib/care/billing.ts
// Nachbar.io — Abrechnungs- und Abo-Hilfsfunktionen

import type { CareSubscriptionPlan } from './types';
import { PLAN_FEATURES } from './constants';

// Plan-Hierarchie (niedrig → hoch)
export const PLAN_HIERARCHY: CareSubscriptionPlan[] = ['free', 'basic', 'family', 'professional', 'premium'];

// Plan-Metadaten fuer UI
export const PLAN_METADATA: Record<CareSubscriptionPlan, {
  label: string;
  description: string;
  price: string;
  highlighted?: boolean;
}> = {
  free: { label: 'Kostenlos', description: 'Grundlegende Sicherheit', price: 'Kostenlos' },
  basic: { label: 'Basis', description: 'Alltagshilfe', price: 'ab 4,99 EUR/Monat' },
  family: { label: 'Familie', description: 'Fuer Angehoerige', price: 'ab 9,99 EUR/Monat', highlighted: true },
  professional: { label: 'Professionell', description: 'Fuer Pflegedienste', price: 'ab 19,99 EUR/Monat' },
  premium: { label: 'Premium', description: 'Rundum-Schutz', price: 'ab 29,99 EUR/Monat' },
};

// Feature-Labels fuer UI-Anzeige
export const FEATURE_LABELS: Record<string, string> = {
  checkin: 'Taegliche Check-ins',
  medical_emergency_sos: 'Medizinischer Notfall-SOS',
  sos_all: 'Alle SOS-Kategorien',
  medications: 'Medikamenten-Verwaltung',
  appointments: 'Termin-Verwaltung',
  relative_dashboard: 'Angehoerigen-Dashboard',
  reports: 'Pflegeberichte & Export',
  audit_log: 'Aktivitaetsprotokoll',
  multi_senior: 'Mehrere Senioren',
  care_dashboard: 'Pflege-Dashboard',
  care_aid_forms: 'Pflegehilfsmittel-Antraege',
  sim_fallback: 'SIM-Fallback (Offline)',
  sms_notifications: 'SMS-Benachrichtigungen',
  voice_notifications: 'Sprach-Benachrichtigungen',
  priority_support: 'Prioritaets-Support',
};

/** Prueft ob Upgrade von current auf target moeglich ist */
export function canUpgrade(current: CareSubscriptionPlan, target: CareSubscriptionPlan): boolean {
  const currentIdx = PLAN_HIERARCHY.indexOf(current);
  const targetIdx = PLAN_HIERARCHY.indexOf(target);
  return targetIdx > currentIdx;
}

/** Prueft ob Trial abgelaufen ist */
export function isTrialExpired(trialEndsAt: string | null): boolean {
  if (!trialEndsAt) return false;
  return new Date(trialEndsAt).getTime() < Date.now();
}

/** Berechnet verbleibende Trial-Tage */
export function trialDaysRemaining(trialEndsAt: string | null): number {
  if (!trialEndsAt) return 0;
  const diff = new Date(trialEndsAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

/** Gibt neue Features bei Upgrade zurueck */
export function getUpgradeFeatures(
  current: CareSubscriptionPlan,
  target: CareSubscriptionPlan
): string[] {
  const currentFeatures = new Set(PLAN_FEATURES[current] ?? []);
  const targetFeatures = PLAN_FEATURES[target] ?? [];
  return targetFeatures.filter(f => !currentFeatures.has(f));
}

/** Gibt den niedrigsten Plan zurueck, der ein Feature enthaelt */
export function minimumPlanForFeature(feature: string): CareSubscriptionPlan | null {
  for (const plan of PLAN_HIERARCHY) {
    if (PLAN_FEATURES[plan]?.includes(feature)) return plan;
  }
  return null;
}
