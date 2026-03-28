'use client';

// Formular zum Erstellen und Bearbeiten von Terminen

import { useState } from 'react';
import type { CareAppointment, CareAppointmentType } from '@/lib/care/types';

interface AppointmentFormProps {
  /** Befülltes Objekt für den Bearbeitungs-Modus */
  appointment?: CareAppointment;
  /** Senior-ID für den Erstell-Modus */
  seniorId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

// Termin-Typ-Optionen für das Select-Feld
const TYPE_OPTIONS: { value: CareAppointmentType; label: string }[] = [
  { value: 'doctor',       label: 'Arzttermin' },
  { value: 'care_service', label: 'Pflegedienst' },
  { value: 'therapy',      label: 'Therapie' },
  { value: 'other',        label: 'Sonstiger Termin' },
];

// ISO-Datetime-String in "YYYY-MM-DDTHH:MM" für datetime-local umwandeln
function toDatetimeLocalValue(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${y}-${mo}-${day}T${h}:${mi}`;
}

export function AppointmentForm({ appointment, seniorId, onSuccess, onCancel }: AppointmentFormProps) {
  const isEdit = Boolean(appointment);

  // Formular-Zustand
  const [title, setTitle] = useState(appointment?.title ?? '');
  const [type, setType] = useState<CareAppointmentType>(appointment?.type ?? 'doctor');
  const [scheduledAt, setScheduledAt] = useState(
    appointment ? toDatetimeLocalValue(appointment.scheduled_at) : ''
  );
  const [durationMinutes, setDurationMinutes] = useState(
    appointment?.duration_minutes ?? 60
  );
  const [location, setLocation] = useState(appointment?.location ?? '');
  const [notes, setNotes] = useState(appointment?.notes ?? '');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Formular absenden: POST (neu) oder PATCH (bearbeiten)
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const payload = {
      title: title.trim(),
      type,
      scheduled_at: new Date(scheduledAt).toISOString(),
      duration_minutes: durationMinutes,
      location: location.trim() || null,
      notes: notes.trim() || null,
      // senior_id wird nur beim Erstellen benötigt
      ...(!isEdit && { senior_id: seniorId }),
    };

    try {
      const url  = isEdit ? `/api/care/appointments/${appointment!.id}` : '/api/care/appointments';
      const method = isEdit ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError((data as { error?: string }).error ?? 'Ein Fehler ist aufgetreten.');
        return;
      }

      onSuccess?.();
    } catch {
      setError('Verbindungsfehler. Bitte versuchen Sie es erneut.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Titel */}
      <div className="space-y-1.5">
        <label htmlFor="appt-title" className="block text-sm font-medium text-anthrazit">
          Titel <span className="text-red-500">*</span>
        </label>
        <input
          id="appt-title"
          type="text"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="z.B. Hausarzt Dr. Müller"
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-anthrazit placeholder:text-gray-400 focus:border-quartier-green focus:outline-none focus:ring-1 focus:ring-quartier-green"
        />
      </div>

      {/* Termin-Typ */}
      <div className="space-y-1.5">
        <label htmlFor="appt-type" className="block text-sm font-medium text-anthrazit">
          Art des Termins
        </label>
        <select
          id="appt-type"
          value={type}
          onChange={(e) => setType(e.target.value as CareAppointmentType)}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-anthrazit focus:border-quartier-green focus:outline-none focus:ring-1 focus:ring-quartier-green"
        >
          {TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Datum und Uhrzeit */}
      <div className="space-y-1.5">
        <label htmlFor="appt-scheduled-at" className="block text-sm font-medium text-anthrazit">
          Datum und Uhrzeit <span className="text-red-500">*</span>
        </label>
        <input
          id="appt-scheduled-at"
          type="datetime-local"
          required
          value={scheduledAt}
          onChange={(e) => setScheduledAt(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-anthrazit focus:border-quartier-green focus:outline-none focus:ring-1 focus:ring-quartier-green"
        />
      </div>

      {/* Dauer */}
      <div className="space-y-1.5">
        <label htmlFor="appt-duration" className="block text-sm font-medium text-anthrazit">
          Dauer (Minuten)
        </label>
        <input
          id="appt-duration"
          type="number"
          min={5}
          max={480}
          value={durationMinutes}
          onChange={(e) => setDurationMinutes(Number(e.target.value))}
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-anthrazit focus:border-quartier-green focus:outline-none focus:ring-1 focus:ring-quartier-green"
        />
      </div>

      {/* Ort */}
      <div className="space-y-1.5">
        <label htmlFor="appt-location" className="block text-sm font-medium text-anthrazit">
          Ort <span className="text-xs font-normal text-muted-foreground">(optional)</span>
        </label>
        <input
          id="appt-location"
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="z.B. Hauptstr. 12, Bad Säckingen"
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-anthrazit placeholder:text-gray-400 focus:border-quartier-green focus:outline-none focus:ring-1 focus:ring-quartier-green"
        />
      </div>

      {/* Notizen */}
      <div className="space-y-1.5">
        <label htmlFor="appt-notes" className="block text-sm font-medium text-anthrazit">
          Notizen <span className="text-xs font-normal text-muted-foreground">(optional)</span>
        </label>
        <textarea
          id="appt-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Hinweise, Vorbereitung, Unterlagen mitnehmen..."
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-anthrazit placeholder:text-gray-400 focus:border-quartier-green focus:outline-none focus:ring-1 focus:ring-quartier-green resize-none"
        />
      </div>

      {/* Fehlermeldung */}
      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}

      {/* Aktions-Buttons */}
      <div className="flex gap-3 pt-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="flex-1 rounded-lg border-2 border-gray-300 py-3 text-sm font-medium text-anthrazit hover:bg-gray-50 active:bg-gray-100 disabled:opacity-50"
            style={{ minHeight: '48px', touchAction: 'manipulation' }}
          >
            Abbrechen
          </button>
        )}
        <button
          type="submit"
          disabled={loading}
          className="flex-1 rounded-lg bg-quartier-green py-3 text-sm font-bold text-white hover:bg-green-600 active:bg-green-700 disabled:opacity-50"
          style={{ minHeight: '48px', touchAction: 'manipulation' }}
        >
          {loading
            ? 'Wird gespeichert...'
            : isEdit
              ? 'Änderungen speichern'
              : 'Termin hinzufügen'}
        </button>
      </div>
    </form>
  );
}
