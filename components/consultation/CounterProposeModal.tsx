// components/consultation/CounterProposeModal.tsx
// Kompakter Dialog für Gegenvorschlag: Datepicker + Zeitauswahl
'use client';

import { useState } from 'react';
import { ArrowRightLeft, X } from 'lucide-react';

interface CounterProposeModalProps {
  open: boolean;
  slotId: string;
  onClose: () => void;
  onSubmit: (slotId: string, scheduledAt: string) => Promise<void>;
}

// Vordefinierte Zeitfenster
const TIME_OPTIONS = [
  { label: '09:00', value: '09:00' },
  { label: '10:00', value: '10:00' },
  { label: '11:00', value: '11:00' },
  { label: '12:00', value: '12:00' },
  { label: '14:00', value: '14:00' },
  { label: '15:00', value: '15:00' },
  { label: '16:00', value: '16:00' },
  { label: '17:00', value: '17:00' },
];

export function CounterProposeModal({ open, slotId, onClose, onSubmit }: CounterProposeModalProps) {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('10:00');
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  // Mindestens morgen
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];

  // Maximal 90 Tage
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + 90);
  const maxDateStr = maxDate.toISOString().split('T')[0];

  async function handleSubmit() {
    if (!date || !time) return;
    setSubmitting(true);
    try {
      const scheduledAt = new Date(`${date}T${time}:00`).toISOString();
      await onSubmit(slotId, scheduledAt);
      onClose();
    } catch {
      alert('Gegenvorschlag konnte nicht gesendet werden.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Dialog */}
      <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-anthrazit">Gegenvorschlag</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label="Schließen"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Datum */}
        <div className="space-y-4">
          <div>
            <label htmlFor="counter-date" className="block text-sm font-medium text-gray-700 mb-1">
              Neues Datum
            </label>
            <input
              id="counter-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              min={minDate}
              max={maxDateStr}
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-base text-anthrazit focus:border-quartier-green focus:outline-none focus:ring-2 focus:ring-quartier-green/20"
            />
          </div>

          {/* Uhrzeit */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Uhrzeit
            </label>
            <div className="grid grid-cols-4 gap-2">
              {TIME_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setTime(opt.value)}
                  className={`rounded-xl border-2 px-3 py-2.5 text-sm font-medium transition-colors ${
                    time === opt.value
                      ? 'border-quartier-green bg-quartier-green/10 text-quartier-green'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={!date || submitting}
            className="flex min-h-[56px] w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 text-base font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
          >
            <ArrowRightLeft className="h-4 w-4" />
            {submitting ? 'Wird gesendet...' : 'Neuen Termin vorschlagen'}
          </button>
        </div>
      </div>
    </div>
  );
}
