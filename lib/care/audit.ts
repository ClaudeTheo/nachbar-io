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
    metadata: params.metadata ?? {},
  });

  if (error) {
    console.error('[care/audit] Fehler beim Schreiben des Audit-Logs:', error);
    // Audit-Fehler sollen den Hauptprozess nicht blockieren
    // aber muessen geloggt werden
  }
}
