// lib/care/escalation.ts
// Nachbar.io — Eskalationslogik fuer das Care-Modul

import type { EscalationConfig } from './types';
import { DEFAULT_ESCALATION_CONFIG, ESCALATION_LEVELS } from './constants';

/**
 * Bestimmt, ob eine SOS-Meldung auf die naechste Eskalationsstufe erhoehen werden sollte.
 * Nutzt Zeit-basierte Schwellenwerte aus der Eskalationskonfiguration.
 *
 * @param currentLevel - Aktuelle Eskalationsstufe (1-4)
 * @param createdAt - ISO-Zeitstempel der Eskalation
 * @param escalatedAt - Array von ISO-Zeitstempeln fruehrer Eskalationen
 * @param config - Eskalationskonfiguration mit Timeout-Werten
 * @returns true wenn eine Eskalation stattfinden sollte, sonst false
 */
export function shouldEscalate(
  currentLevel: number,
  createdAt: string,
  escalatedAt: string[],
  config: EscalationConfig = DEFAULT_ESCALATION_CONFIG
): boolean {
  // Level 4 ist die maximale Eskalationsstufe
  if (currentLevel >= 4) return false;

  // Referenzzeit: neuester escalatedAt timestamp, sonst createdAt
  const referenceTime = escalatedAt.length > 0
    ? new Date(escalatedAt[escalatedAt.length - 1])
    : new Date(createdAt);

  // Verstrichene Zeit in Minuten
  const elapsedMinutes = (Date.now() - referenceTime.getTime()) / (1000 * 60);

  // Timeout-Map basierend auf aktueller Stufe
  const timeoutMap: Record<number, number> = {
    1: config.escalate_to_level_2_after_minutes,
    2: config.escalate_to_level_3_after_minutes,
    3: config.escalate_to_level_4_after_minutes,
  };

  const timeout = timeoutMap[currentLevel];
  if (timeout === undefined) return false;

  return elapsedMinutes >= timeout;
}

/**
 * Gibt die naechste Eskalationsstufe zurueck.
 *
 * @param currentLevel - Aktuelle Eskalationsstufe (1-4)
 * @returns Naechste Stufe (2-4) oder null wenn bereits auf Level 4
 */
export function getNextEscalationLevel(currentLevel: number): number | null {
  if (currentLevel >= 4) return null;
  return currentLevel + 1;
}

/**
 * Gibt die Metadaten einer Eskalationsstufe zurueck (Label, Rolle, Channels).
 *
 * @param level - Eskalationsstufe (1-4)
 * @returns Metadaten oder null wenn Stufe nicht existiert
 */
export function getEscalationMeta(level: number) {
  return ESCALATION_LEVELS.find((l) => l.level === level) ?? null;
}

/**
 * Berechnet die Minuten bis zur naechsten automatischen Eskalation.
 *
 * @param currentLevel - Aktuelle Eskalationsstufe (1-4)
 * @param createdAt - ISO-Zeitstempel der Eskalation
 * @param escalatedAt - Array von ISO-Zeitstempeln fruehrer Eskalationen
 * @param config - Eskalationskonfiguration mit Timeout-Werten
 * @returns Minuten bis Eskalation (0 = ausstehend) oder null wenn Level 4 erreicht
 */
export function minutesUntilEscalation(
  currentLevel: number,
  createdAt: string,
  escalatedAt: string[],
  config: EscalationConfig = DEFAULT_ESCALATION_CONFIG
): number | null {
  if (currentLevel >= 4) return null;

  const referenceTime = escalatedAt.length > 0
    ? new Date(escalatedAt[escalatedAt.length - 1])
    : new Date(createdAt);

  const elapsedMinutes = (Date.now() - referenceTime.getTime()) / (1000 * 60);

  const timeoutMap: Record<number, number> = {
    1: config.escalate_to_level_2_after_minutes,
    2: config.escalate_to_level_3_after_minutes,
    3: config.escalate_to_level_4_after_minutes,
  };

  const timeout = timeoutMap[currentLevel];
  if (timeout === undefined) return null;

  return Math.max(0, timeout - elapsedMinutes);
}
