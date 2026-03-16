'use client';

import { useState } from 'react';
import { X, Calendar, Clock, Send } from 'lucide-react';

const REASONS = [
  { value: 'kontrolltermin', label: 'Kontrolltermin' },
  { value: 'beratung', label: 'Beratung' },
  { value: 'erstgespraech', label: 'Erstgespräch' },
  { value: 'sonstiges', label: 'Sonstiges' },
];

const TIME_OPTIONS = [
  { value: '09:00', label: 'Vormittag (9:00)' },
  { value: '12:00', label: 'Mittag (12:00)' },
  { value: '14:00', label: 'Nachmittag (14:00)' },
  { value: '16:00', label: 'Spätnachmittag (16:00)' },
];

interface RequestAppointmentModalProps {
  doctorUserId: string;
  quarterId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function RequestAppointmentModal({
  doctorUserId,
  quarterId,
  onClose,
  onSuccess,
}: RequestAppointmentModalProps) {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('09:00');
  const [reason, setReason] = useState('beratung');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Minimum: morgen
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];

  // Maximum: 90 Tage
  const maxDateObj = new Date();
  maxDateObj.setDate(maxDateObj.getDate() + 90);
  const maxDate = maxDateObj.toISOString().split('T')[0];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!date) {
      setError('Bitte wählen Sie ein Datum');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const scheduledAt = `${date}T${time}:00`;
      const res = await fetch('/api/care/consultations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quarter_id: quarterId,
          provider_type: 'community',
          host_user_id: doctorUserId,
          host_name: reason,
          title: `Terminwunsch: ${REASONS.find(r => r.value === reason)?.label}`,
          scheduled_at: scheduledAt,
          duration_minutes: 15,
          proposed_by: 'self',
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Anfrage fehlgeschlagen');
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold text-anthrazit">Terminwunsch senden</h2>
          <button
            onClick={onClose}
            className="rounded-xl p-2 hover:bg-anthrazit/5"
            aria-label="Schließen"
          >
            <X className="h-5 w-5 text-anthrazit" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Datum */}
          <div>
            <label className="mb-1 block text-sm font-medium text-anthrazit">
              <Calendar className="mr-1 inline h-4 w-4" />
              Wunschdatum
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              min={minDate}
              max={maxDate}
              className="w-full rounded-xl border border-gray-200 p-3 text-base text-anthrazit focus:border-quartier-green focus:outline-none focus:ring-1 focus:ring-quartier-green"
              required
            />
          </div>

          {/* Uhrzeit */}
          <div>
            <label className="mb-1 block text-sm font-medium text-anthrazit">
              <Clock className="mr-1 inline h-4 w-4" />
              Wunschzeit
            </label>
            <select
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full rounded-xl border border-gray-200 p-3 text-base text-anthrazit focus:border-quartier-green focus:outline-none focus:ring-1 focus:ring-quartier-green"
            >
              {TIME_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Grund */}
          <div>
            <label className="mb-1 block text-sm font-medium text-anthrazit">
              Grund
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-xl border border-gray-200 p-3 text-base text-anthrazit focus:border-quartier-green focus:outline-none focus:ring-1 focus:ring-quartier-green"
            >
              {REASONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          {error && (
            <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>
          )}

          {/* Submit-Button (80px Seniorenmodus) */}
          <button
            type="submit"
            disabled={submitting}
            className="flex min-h-[80px] w-full items-center justify-center gap-2 rounded-2xl bg-quartier-green text-lg font-semibold text-white transition-colors hover:bg-quartier-green/90 active:bg-quartier-green/80 disabled:opacity-50"
          >
            <Send className="h-5 w-5" />
            {submitting ? 'Wird gesendet...' : 'Terminwunsch senden'}
          </button>
        </form>
      </div>
    </div>
  );
}
