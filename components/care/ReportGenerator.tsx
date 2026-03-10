// components/care/ReportGenerator.tsx
// Nachbar.io — Bericht-Generator Formular
'use client';

import { useState } from 'react';
import { FileText, Loader2, CheckCircle } from 'lucide-react';
import type { CareDocumentType } from '@/lib/care/types';

const REPORT_TYPES: Array<{ value: CareDocumentType; label: string }> = [
  { value: 'care_report_daily', label: 'Tagesbericht' },
  { value: 'care_report_weekly', label: 'Wochenbericht' },
  { value: 'care_report_monthly', label: 'Monatsbericht' },
  { value: 'emergency_log', label: 'Notfall-Protokoll' },
  { value: 'medication_report', label: 'Medikamenten-Bericht' },
];

interface ReportGeneratorProps {
  seniorId: string;
  onGenerated?: () => void;
}

export function ReportGenerator({ seniorId, onGenerated }: ReportGeneratorProps) {
  const [type, setType] = useState<CareDocumentType>('care_report_weekly');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewUrl, setViewUrl] = useState<string | null>(null);

  async function handleGenerate() {
    if (!periodStart || !periodEnd) {
      setError('Bitte waehlen Sie einen Zeitraum.');
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch('/api/care/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, period_start: periodStart, period_end: periodEnd, senior_id: seniorId }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? 'Fehler bei der Generierung');
        return;
      }

      setSuccess(true);
      setViewUrl(`/care/reports/view?senior_id=${seniorId}&period_start=${periodStart}&period_end=${periodEnd}&type=${type}`);
      onGenerated?.();

      // Erfolg nach 3 Sekunden zuruecksetzen
      setTimeout(() => setSuccess(false), 3000);
    } catch {
      setError('Netzwerkfehler');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border bg-card p-4 space-y-4">
      <div className="flex items-center gap-2">
        <FileText className="h-5 w-5 text-quartier-green" />
        <h3 className="text-sm font-semibold text-[#2D3142]">Bericht erstellen</h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Typ */}
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Berichtstyp</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as CareDocumentType)}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
          >
            {REPORT_TYPES.map(rt => (
              <option key={rt.value} value={rt.value}>{rt.label}</option>
            ))}
          </select>
        </div>

        {/* Zeitraum Start */}
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Von</label>
          <input
            type="date"
            value={periodStart}
            onChange={(e) => setPeriodStart(e.target.value)}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
          />
        </div>

        {/* Zeitraum Ende */}
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Bis</label>
          <input
            type="date"
            value={periodEnd}
            onChange={(e) => setPeriodEnd(e.target.value)}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
          />
        </div>
      </div>

      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}

      {success && viewUrl && (
        <div className="flex items-center gap-2 text-xs text-quartier-green">
          <CheckCircle className="h-4 w-4" />
          <span>Bericht erstellt!</span>
          <a href={viewUrl} className="underline font-medium">Ansehen</a>
        </div>
      )}

      <button
        onClick={handleGenerate}
        disabled={loading || !periodStart || !periodEnd}
        className="w-full sm:w-auto rounded-lg bg-[#2D3142] px-4 py-2 text-sm font-medium text-white hover:bg-[#2D3142]/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Wird erstellt...
          </>
        ) : (
          <>
            <FileText className="h-4 w-4" />
            Bericht erstellen
          </>
        )}
      </button>
    </div>
  );
}
