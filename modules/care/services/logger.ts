// lib/care/logger.ts
// Nachbar.io — Strukturiertes JSON-Logging fuer Care-kritische API-Routen
// Gibt korrelierbare, maschinenlesbare Log-Eintraege aus (Vercel Logs / Structured Logging)

import { randomUUID } from 'crypto';
import * as Sentry from '@sentry/nextjs';

/** Log-Level fuer strukturierte Ausgabe */
type LogLevel = 'info' | 'warn' | 'error';

/** Basis-Felder jedes Log-Eintrags */
interface LogEntry {
  timestamp: string;
  level: LogLevel;
  requestId: string;
  route: string;
  event: string;
  userId?: string;
  alertId?: string;
  duration_ms?: number;
  metadata?: Record<string, unknown>;
  error?: string;
}

/**
 * Erstellt einen strukturierten Logger fuer eine API-Route.
 * Jeder Logger traegt eine requestId (Correlation-ID) ueber den gesamten Request.
 *
 * Verwendung:
 *   const log = createCareLogger('care/sos');
 *   log.info('sos_triggered', { userId: user.id, category: 'medical_emergency' });
 *   log.error('db_insert_failed', { error: insertError.message });
 *   log.done(201); // abschliessender Log mit Dauer
 */
export function createCareLogger(route: string, existingRequestId?: string) {
  const requestId = existingRequestId ?? randomUUID().slice(0, 12);
  const startTime = Date.now();

  function emit(level: LogLevel, event: string, fields?: Partial<LogEntry>) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      requestId,
      route,
      event,
      ...fields,
    };

    // JSON-Ausgabe — wird von Vercel Logs und Structured Logging Pipelines erkannt
    const output = JSON.stringify(entry);

    switch (level) {
      case 'error':
        console.error(output);
        break;
      case 'warn':
        console.warn(output);
        break;
      default:
        console.log(output);
    }
  }

  return {
    /** Eindeutige Request-ID (Correlation-ID) */
    requestId,

    /** Informations-Log (normaler Ablauf) */
    info(event: string, metadata?: Record<string, unknown>, fields?: Partial<LogEntry>) {
      emit('info', event, { metadata, ...fields });
    },

    /** Warn-Log (unerwarteter aber nicht-kritischer Zustand) */
    warn(event: string, metadata?: Record<string, unknown>, fields?: Partial<LogEntry>) {
      emit('warn', event, { metadata, ...fields });
    },

    /** Error-Log (Fehler, der den Ablauf beeintraechtigt) */
    error(event: string, error?: unknown, metadata?: Record<string, unknown>, fields?: Partial<LogEntry>) {
      const errorMessage = error instanceof Error ? error.message : String(error ?? '');
      emit('error', event, { error: errorMessage, metadata, ...fields });

      // Sentry-Bridge (R7): Fehler-Aggregation fuer Care-/SOS-kritische Pfade.
      // Bewusst OHNE metadata/userId — beforeSend redigiert `extra` nicht (DSGVO);
      // Fehlermeldungen selbst werden dort E-Mail-/Telefon-redigiert.
      try {
        const exception =
          error instanceof Error ? error : new Error(`${event}: ${errorMessage}`);
        Sentry.captureException(exception, {
          tags: {
            care_route: route,
            care_event: event,
            request_id: requestId,
          },
        });
      } catch {
        // Sentry darf das strukturierte Logging nie verhindern
      }
    },

    /** Abschluss-Log mit Gesamt-Dauer und HTTP-Statuscode */
    done(statusCode: number, metadata?: Record<string, unknown>) {
      emit('info', 'request_complete', {
        duration_ms: Date.now() - startTime,
        metadata: { statusCode, ...metadata },
      });
    },
  };
}
