// lib/care/audit.ts
// Revisionssicheres Audit-Log fuer das Care-Modul

import type { SupabaseClient } from '@supabase/supabase-js';
import type { CareAuditEventType } from './types';

interface AuditLogParams {
  seniorId: string;
  actorId: string;
  eventType: CareAuditEventType;
  referenceType?: string;
  referenceId?: string;
  metadata?: Record<string, unknown>;
}

// Sensible Freitext-Schluessel, die niemals im Audit-Log-metadata landen duerfen.
// Hintergrund (Pre-Pilot-Audit W4/M8): Art.-9-Gesundheitsdaten (Medikamentenname,
// SOS-Notizen, Care-Task-Titel) standen im Klartext im freien jsonb-metadata, obwohl
// die Quellspalten AES-verschluesselt sind. Datenminimierung (Art. 5 Abs. 1 lit. c):
// fuer die Nachvollziehbarkeit reicht reference_id auf den verschluesselten Quell-Record.
const SENSITIVE_METADATA_KEYS: ReadonlySet<string> = new Set([
  'name',
  'medicationname',
  'notes',
  'note',
  'title',
  'message',
  'content',
  'text',
  'description',
  'body',
  'summary',
]);

/**
 * Entfernt sensible Freitext-Felder aus Audit-Metadaten (Art.-9-Schutz).
 * Schluesselvergleich ist case-insensitiv. IDs, Status, Kategorien und Aktionen
 * bleiben erhalten — sie sind fuer die Nachvollziehbarkeit noetig und nicht sensibel.
 */
export function sanitizeAuditMetadata(
  metadata?: Record<string, unknown>
): Record<string, unknown> {
  if (!metadata) return {};
  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (SENSITIVE_METADATA_KEYS.has(key.toLowerCase())) continue;
    clean[key] = value;
  }
  return clean;
}

/**
 * Schreibt einen revisionssicheren Audit-Eintrag.
 * Append-only: UPDATE/DELETE sind per DB-Trigger blockiert.
 */
export async function writeAuditLog(
  supabase: SupabaseClient,
  params: AuditLogParams
): Promise<void> {
  const { error } = await supabase.from('care_audit_log').insert({
    senior_id: params.seniorId,
    actor_id: params.actorId,
    event_type: params.eventType,
    reference_type: params.referenceType ?? null,
    reference_id: params.referenceId ?? null,
    metadata: sanitizeAuditMetadata(params.metadata),
  });

  if (error) {
    console.error('[care/audit] Fehler beim Schreiben des Audit-Logs:', error);
    // Audit-Fehler sollen den Hauptprozess nicht blockieren
    // aber muessen geloggt werden
  }
}
