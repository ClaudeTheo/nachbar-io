'use client';

// Dialog zum schnellen Protokollieren einer Medikamenten-Einnahme

import { useState } from 'react';
import { Pill, X } from 'lucide-react';
import type { CareMedication, CareMedicationLogStatus } from '@/lib/care/types';

interface MedicationLogDialogProps {
  medication: CareMedication;
  scheduledAt: string;
  onClose: () => void;
  onSuccess: () => void;
}

// Aktions-Konfiguration für die drei grossen Buttons
const ACTIONS: Array<{ status: CareMedicationLogStatus; label: string; className: string }> = [
  {
    status: 'taken',
    label: 'Genommen',
    className: 'bg-quartier-green text-white active:bg-green-700',
  },
  {
    status: 'skipped',
    label: 'Übersprungen',
    className: 'border-2 border-gray-300 text-muted-foreground active:bg-gray-100',
  },
  {
    status: 'snoozed',
    label: 'Später erinnern',
    className: 'border-2 border-alert-amber text-alert-amber active:bg-amber-50',
  },
];

// Uhrzeit aus ISO-String extrahieren
function formatTime(iso: string): string {
  const d = new Date(iso);
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m} Uhr`;
}

export function MedicationLogDialog({ medication, scheduledAt, onClose, onSuccess }: MedicationLogDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAction(status: CareMedicationLogStatus) {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/care/medications/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          medication_id: medication.id,
          status,
          scheduled_at: scheduledAt,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? 'Fehler beim Speichern');
        setLoading(false);
        return;
      }

      // Automatisch schließen nach Erfolg
      onSuccess();
      onClose();
    } catch {
      setError('Verbindungsfehler');
    }

    setLoading(false);
  }

  return (
    /* Hintergrund-Overlay */
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Dialog-Panel */}
      <div className="w-full max-w-md rounded-t-2xl bg-white pb-8 pt-4">
        {/* Kopfzeile */}
        <div className="flex items-center justify-between px-4 pb-4">
          <div className="flex items-center gap-2">
            <Pill className="h-5 w-5 text-anthrazit" />
            <div>
              <p className="font-bold text-anthrazit">{medication.name}</p>
              {medication.dosage && (
                <p className="text-sm text-muted-foreground">{medication.dosage}</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="rounded-full p-2 text-muted-foreground hover:bg-gray-100 disabled:opacity-50"
            aria-label="Schliessen"
            style={{ minHeight: '44px', minWidth: '44px', touchAction: 'manipulation' }}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Geplante Uhrzeit */}
        <p className="px-4 pb-4 text-sm text-muted-foreground">
          Geplant: {formatTime(scheduledAt)}
        </p>

        {/* Fehlermeldung */}
        {error && (
          <div className="mx-4 mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 text-center">
            {error}
          </div>
        )}

        {/* Aktions-Buttons */}
        <div className="space-y-3 px-4">
          {ACTIONS.map((action) => (
            <button
              key={action.status}
              onClick={() => handleAction(action.status)}
              disabled={loading}
              className={`w-full rounded-xl px-4 py-4 text-xl font-bold transition-opacity disabled:opacity-50 ${action.className}`}
              style={{ minHeight: '80px', touchAction: 'manipulation' }}
            >
              {loading ? 'Wird gespeichert …' : action.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
