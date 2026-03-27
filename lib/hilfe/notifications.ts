// Nachbar Hilfe — Push-Notification Builder (pure functions)

import { HELP_CATEGORY_LABELS, type HelpCategory } from './types';

export interface PushPayload {
  title: string;
  body: string;
  url: string;
  tag: string;
}

/** Kategorie-Label nachschlagen, Fallback auf Rohwert */
function getCategoryLabel(category: string): string {
  return HELP_CATEGORY_LABELS[category as HelpCategory] ?? category;
}

/** Beschreibung auf maximal `max` Zeichen kuerzen */
function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 1) + '…';
}

/**
 * Benachrichtigung fuer ein neues Hilfe-Gesuch im Quartier.
 * Wird an alle potentiellen Helfer im Quartier gesendet.
 */
export function buildHelpRequestNotification(
  category: string,
  description?: string | null,
): PushPayload {
  const label = getCategoryLabel(category);
  const desc = description ? ` — ${truncate(description, 60)}` : '';

  return {
    title: 'Neues Hilfe-Gesuch in Ihrem Quartier',
    body: `Kategorie: ${label}${desc}`,
    url: '/hilfe',
    tag: `help-request-${Date.now()}`,
  };
}

/**
 * Benachrichtigung wenn ein Helfer gefunden wurde.
 * Wird an den Hilfesuchenden gesendet.
 */
export function buildMatchNotification(
  helperName: string,
  category: string,
): PushPayload {
  const label = getCategoryLabel(category);

  return {
    title: 'Helfer gefunden!',
    body: `${helperName} möchte Ihnen bei „${label}" helfen.`,
    url: '/hilfe',
    tag: `help-match-${Date.now()}`,
  };
}

/**
 * Erinnerung an ausstehende Unterschrift fuer eine Einsatz-Quittung.
 * Wird an Helfer oder Bewohner gesendet, je nachdem wer noch nicht unterschrieben hat.
 */
export function buildSignatureReminder(sessionId: string): PushPayload {
  return {
    title: 'Unterschrift ausstehend',
    body: 'Ein Einsatz wartet auf Ihre Unterschrift für die Quittung.',
    url: `/hilfe/einsatz/${sessionId}`,
    tag: `help-sign-${sessionId}`,
  };
}
