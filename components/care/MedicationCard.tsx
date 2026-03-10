'use client';

// Zeigt eine einzelne Medikamenten-Einnahme mit Status und Aktions-Buttons

import { Pill } from 'lucide-react';
import type { CareMedication, CareMedicationLogStatus } from '@/lib/care/types';

interface MedicationCardProps {
  medication: CareMedication;
  scheduledAt: string;
  status: string;
  snoozedUntil?: string | null;
  onAction?: (status: CareMedicationLogStatus) => void;
}

// Status-Badge Konfiguration
const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  pending:  { label: 'Ausstehend',    className: 'bg-gray-100 text-gray-600' },
  taken:    { label: 'Genommen',      className: 'bg-green-100 text-quartier-green' },
  skipped:  { label: 'Uebersprungen', className: 'bg-amber-100 text-alert-amber' },
  snoozed:  { label: 'Verschoben',    className: 'bg-blue-100 text-blue-600' },
  missed:   { label: 'Verpasst',      className: 'bg-red-100 text-red-600' },
};

// Uhrzeit aus ISO-String extrahieren (z.B. "08:00 Uhr")
function formatTime(iso: string): string {
  const d = new Date(iso);
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m} Uhr`;
}

export function MedicationCard({ medication, scheduledAt, status, snoozedUntil, onAction }: MedicationCardProps) {
  const badge = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
      {/* Kopfzeile: Icon, Name, Dosage, Uhrzeit, Status-Badge */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100">
            <Pill className="h-5 w-5 text-anthrazit" />
          </div>
          <div>
            <p className="font-bold text-anthrazit leading-tight">{medication.name}</p>
            {medication.dosage && (
              <p className="text-sm text-muted-foreground">{medication.dosage}</p>
            )}
            <p className="mt-0.5 text-sm text-muted-foreground">{formatTime(scheduledAt)}</p>
          </div>
        </div>

        {/* Status-Badge */}
        <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.className}`}>
          {badge.label}
        </span>
      </div>

      {/* Anweisungen */}
      {medication.instructions && (
        <p className="text-sm text-muted-foreground border-t pt-2">{medication.instructions}</p>
      )}

      {/* Verschoben-bis Hinweis */}
      {status === 'snoozed' && snoozedUntil && (
        <p className="text-sm text-blue-600">
          Erneute Erinnerung um {formatTime(snoozedUntil)}
        </p>
      )}

      {/* Aktions-Buttons (nur bei 'pending') */}
      {status === 'pending' && onAction && (
        <div className="flex gap-2 pt-1">
          {/* Genommen */}
          <button
            onClick={() => onAction('taken')}
            className="flex-1 rounded-lg bg-quartier-green py-3 font-bold text-white active:bg-green-700"
            style={{ minHeight: '48px', touchAction: 'manipulation' }}
          >
            Genommen
          </button>
          {/* Spaeter */}
          <button
            onClick={() => onAction('snoozed')}
            className="flex-1 rounded-lg border-2 border-alert-amber py-3 font-medium text-alert-amber active:bg-amber-50"
            style={{ minHeight: '48px', touchAction: 'manipulation' }}
          >
            Spaeter
          </button>
          {/* Uebersprungen */}
          <button
            onClick={() => onAction('skipped')}
            className="flex-1 rounded-lg border-2 border-gray-300 py-3 font-medium text-muted-foreground active:bg-gray-100"
            style={{ minHeight: '48px', touchAction: 'manipulation' }}
          >
            Uebersprungen
          </button>
        </div>
      )}
    </div>
  );
}
