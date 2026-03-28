// lib/care/billing.ts
// Nachbar.io — Abrechnungs- und Abo-Hilfsfunktionen

import type { CareSubscriptionPlan } from './types';
import { PLAN_FEATURES } from './constants';

// Plan-Hierarchie (niedrig → hoch)
export const PLAN_HIERARCHY: CareSubscriptionPlan[] = ['free', 'plus', 'pro'];

// Plan-Metadaten fuer UI
export const PLAN_METADATA: Record<CareSubscriptionPlan, {
  label: string;
  description: string;
  price: string;
  priceYearly?: string;
  highlighted?: boolean;
}> = {
  free: { label: 'Free', description: 'Grundlegende Nachbarschaft', price: 'Kostenlos' },
  plus: { label: 'Plus', description: 'Voller Funktionsumfang', price: '4,99 EUR/Monat', priceYearly: '49,90 EUR/Jahr', highlighted: true },
  pro: { label: 'Pro', description: 'Fuer Quartier-Manager & Pflegedienste', price: '14,99 EUR/Monat', priceYearly: '149,90 EUR/Jahr' },
};

// Feature-Labels fuer UI-Anzeige
export const FEATURE_LABELS: Record<string, string> = {
  // Free
  alerts_receive: 'Alarme empfangen',
  alerts_send: 'Alarme senden',
  pinnwand_read: 'Pinnwand lesen',
  pinnwand_post: 'Pinnwand posten',
  profile_basic: 'Basisprofil',
  help_basic: 'Grundlegende Hilfe',
  push_notifications: 'Push-Benachrichtigungen',
  senior_mode: 'Senioren-Modus',
  checkin: 'Taegliche Check-ins',
  medical_emergency_sos: 'Medizinischer Notfall-SOS',
  sos_all: 'Alle SOS-Kategorien',
  // Plus
  marketplace: 'Marktplatz',
  events_create: 'Events erstellen',
  help_extended: 'Erweiterte Hilfe',
  group_messages: 'Gruppen-Nachrichten',
  ai_digest: 'KI-Nachrichten-Zusammenfassung',
  profile_extended: 'Erweitertes Profil',
  ad_free: 'Werbefrei',
  medications: 'Medikamenten-Verwaltung',
  appointments: 'Termin-Verwaltung',
  reports: 'Pflegeberichte & Export',
  // Pro
  quarter_dashboard: 'Quartier-Dashboard',
  bulk_invites: 'Massen-Einladungen',
  moderation_tools: 'Moderations-Tools',
  polls: 'Umfragen',
  sponsor_management: 'Sponsor-Verwaltung',
  export_csv_pdf: 'CSV/PDF-Export',
  priority_support: 'Prioritaets-Support',
  multi_senior: 'Mehrere Senioren',
  care_dashboard: 'Pflege-Dashboard',
  audit_log: 'Aktivitaetsprotokoll',
  relative_dashboard: 'Angehoerigen-Dashboard',
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
