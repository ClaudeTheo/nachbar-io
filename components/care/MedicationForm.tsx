'use client';

// Medikament-Formular: Name, Dosierung, Zeitplan (taeglich/woechentlich/intervall), Anweisungen

import { useState } from 'react';
import { toast } from 'sonner';
import { Plus, X, Save, Loader2 } from 'lucide-react';
import type { CareMedication, MedicationSchedule } from '@/lib/care/types';

// Zeitplan-Typen
const SCHEDULE_TYPE_OPTIONS = [
  { value: 'daily', label: 'Taeglich' },
  { value: 'weekly', label: 'Woechentlich' },
  { value: 'interval', label: 'Intervall (alle X Stunden)' },
] as const;

// Wochentage fuer woechentlichen Zeitplan
const WEEKDAY_OPTIONS = [
  { value: 'Montag', short: 'Mo' },
  { value: 'Dienstag', short: 'Di' },
  { value: 'Mittwoch', short: 'Mi' },
  { value: 'Donnerstag', short: 'Do' },
  { value: 'Freitag', short: 'Fr' },
  { value: 'Samstag', short: 'Sa' },
  { value: 'Sonntag', short: 'So' },
] as const;

interface MedicationFormProps {
  medication?: CareMedication;
  seniorId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function MedicationForm({ medication, seniorId, onSuccess, onCancel }: MedicationFormProps) {
  const isEdit = !!medication;

  // Formular-State
  const [name, setName] = useState(medication?.name ?? '');
  const [dosage, setDosage] = useState(medication?.dosage ?? '');
  const [scheduleType, setScheduleType] = useState<MedicationSchedule['type']>(
    medication?.schedule?.type ?? 'daily'
  );
  const [times, setTimes] = useState<string[]>(
    medication?.schedule?.times ?? medication?.schedule?.time ? [medication?.schedule?.time ?? '08:00'] : ['08:00']
  );
  const [days, setDays] = useState<string[]>(medication?.schedule?.days ?? []);
  const [weeklyTime, setWeeklyTime] = useState(medication?.schedule?.time ?? '08:00');
  const [intervalHours, setIntervalHours] = useState(medication?.schedule?.every_hours ?? 8);
  const [instructions, setInstructions] = useState(medication?.instructions ?? '');
  const [saving, setSaving] = useState(false);

  // Uhrzeiten verwalten (fuer taeglich)
  function addTime() {
    setTimes([...times, '12:00']);
  }
  function removeTime(index: number) {
    setTimes(times.filter((_, i) => i !== index));
  }
  function updateTime(index: number, value: string) {
    const updated = [...times];
    updated[index] = value;
    setTimes(updated);
  }

  // Wochentag togglen
  function toggleDay(day: string) {
    if (days.includes(day)) {
      setDays(days.filter((d) => d !== day));
    } else {
      setDays([...days, day]);
    }
  }

  // Zeitplan-Objekt zusammenbauen
  function buildSchedule(): MedicationSchedule {
    switch (scheduleType) {
      case 'daily':
        return { type: 'daily', times };
      case 'weekly':
        return { type: 'weekly', days, time: weeklyTime };
      case 'interval':
        return { type: 'interval', every_hours: intervalHours };
      default:
        return { type: 'daily', times };
    }
  }

  // Validierung
  function validate(): string | null {
    if (!name.trim()) return 'Bitte geben Sie den Medikamentennamen ein.';
    if (name.trim().length < 2) return 'Der Name muss mindestens 2 Zeichen lang sein.';

    if (scheduleType === 'daily' && times.length === 0) {
      return 'Bitte geben Sie mindestens eine Uhrzeit an.';
    }
    if (scheduleType === 'weekly' && days.length === 0) {
      return 'Bitte waehlen Sie mindestens einen Wochentag aus.';
    }
    if (scheduleType === 'interval' && (!intervalHours || intervalHours < 1)) {
      return 'Bitte geben Sie ein gueltiges Intervall an (mindestens 1 Stunde).';
    }
    return null;
  }

  // Speichern
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const validationError = validate();
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setSaving(true);

    const schedule = buildSchedule();
    const payload = {
      name: name.trim(),
      dosage: dosage.trim() || null,
      schedule,
      instructions: instructions.trim() || null,
      ...(seniorId ? { senior_id: seniorId } : {}),
    };

    try {
      const url = isEdit
        ? `/api/care/medications/${medication.id}`
        : '/api/care/medications';
      const method = isEdit ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || 'Medikament konnte nicht gespeichert werden');
        setSaving(false);
        return;
      }

      toast.success(isEdit ? 'Medikament aktualisiert' : 'Medikament hinzugefuegt');
      if (onSuccess) onSuccess();
    } catch {
      toast.error('Verbindungsfehler');
    }
    setSaving(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Name */}
      <div>
        <label htmlFor="med-name" className="block text-sm font-medium text-anthrazit mb-1">
          Medikamentenname *
        </label>
        <input
          id="med-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="z.B. Metformin, Aspirin, Ibuprofen..."
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-anthrazit focus:border-quartier-green focus:outline-none focus:ring-1 focus:ring-quartier-green"
          required
          maxLength={200}
        />
      </div>

      {/* Dosierung */}
      <div>
        <label htmlFor="med-dosage" className="block text-sm font-medium text-anthrazit mb-1">
          Dosierung
        </label>
        <input
          id="med-dosage"
          type="text"
          value={dosage}
          onChange={(e) => setDosage(e.target.value)}
          placeholder="z.B. 1 Tablette, 500mg, 5ml..."
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-anthrazit focus:border-quartier-green focus:outline-none focus:ring-1 focus:ring-quartier-green"
          maxLength={100}
        />
      </div>

      {/* Zeitplan-Typ */}
      <div>
        <label className="block text-sm font-medium text-anthrazit mb-2">
          Einnahme-Zeitplan *
        </label>
        <div className="grid grid-cols-3 gap-2">
          {SCHEDULE_TYPE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setScheduleType(opt.value)}
              className={`rounded-lg border-2 px-3 py-2.5 text-sm font-medium transition-colors ${
                scheduleType === opt.value
                  ? 'border-quartier-green bg-quartier-green/10 text-quartier-green'
                  : 'border-gray-200 text-muted-foreground hover:border-gray-300'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Uhrzeiten (fuer taeglich) */}
      {scheduleType === 'daily' && (
        <div>
          <label className="block text-sm font-medium text-anthrazit mb-2">Einnahmezeiten</label>
          <div className="space-y-2">
            {times.map((time, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  type="time"
                  value={time}
                  onChange={(e) => updateTime(index, e.target.value)}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-anthrazit focus:border-quartier-green focus:outline-none focus:ring-1 focus:ring-quartier-green"
                />
                {times.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeTime(index)}
                    className="rounded-lg p-2 text-muted-foreground hover:text-emergency-red hover:bg-emergency-red/10 transition-colors"
                    aria-label="Uhrzeit entfernen"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={addTime}
              className="flex items-center gap-1 text-sm text-quartier-green hover:underline"
            >
              <Plus className="h-4 w-4" />
              Uhrzeit hinzufuegen
            </button>
          </div>
        </div>
      )}

      {/* Wochentage + Uhrzeit (fuer woechentlich) */}
      {scheduleType === 'weekly' && (
        <>
          <div>
            <label className="block text-sm font-medium text-anthrazit mb-2">Wochentage</label>
            <div className="flex gap-2 flex-wrap">
              {WEEKDAY_OPTIONS.map((day) => (
                <button
                  key={day.value}
                  type="button"
                  onClick={() => toggleDay(day.value)}
                  className={`rounded-lg border-2 px-3 py-2 text-sm font-medium transition-colors ${
                    days.includes(day.value)
                      ? 'border-quartier-green bg-quartier-green/10 text-quartier-green'
                      : 'border-gray-200 text-muted-foreground hover:border-gray-300'
                  }`}
                >
                  {day.short}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label htmlFor="weekly-time" className="block text-sm font-medium text-anthrazit mb-1">
              Uhrzeit
            </label>
            <input
              id="weekly-time"
              type="time"
              value={weeklyTime}
              onChange={(e) => setWeeklyTime(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-anthrazit focus:border-quartier-green focus:outline-none focus:ring-1 focus:ring-quartier-green"
            />
          </div>
        </>
      )}

      {/* Intervall (fuer intervall) */}
      {scheduleType === 'interval' && (
        <div>
          <label htmlFor="interval-hours" className="block text-sm font-medium text-anthrazit mb-1">
            Alle wie viele Stunden?
          </label>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Alle</span>
            <input
              id="interval-hours"
              type="number"
              min={1}
              max={72}
              value={intervalHours}
              onChange={(e) => setIntervalHours(parseInt(e.target.value) || 8)}
              className="w-20 rounded-lg border border-gray-300 px-3 py-2 text-sm text-center text-anthrazit focus:border-quartier-green focus:outline-none focus:ring-1 focus:ring-quartier-green"
            />
            <span className="text-sm text-muted-foreground">Stunden</span>
          </div>
        </div>
      )}

      {/* Anweisungen */}
      <div>
        <label htmlFor="med-instructions" className="block text-sm font-medium text-anthrazit mb-1">
          Besondere Anweisungen
        </label>
        <textarea
          id="med-instructions"
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          placeholder="z.B. Vor dem Essen einnehmen, mit viel Wasser..."
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-anthrazit focus:border-quartier-green focus:outline-none focus:ring-1 focus:ring-quartier-green"
          rows={2}
          maxLength={2000}
        />
      </div>

      {/* Buttons */}
      <div className="flex gap-3">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-xl border border-gray-300 px-4 py-3 text-sm font-medium text-anthrazit hover:bg-gray-50 transition-colors"
            style={{ minHeight: '48px' }}
          >
            Abbrechen
          </button>
        )}
        <button
          type="submit"
          disabled={saving}
          className={`${onCancel ? 'flex-1' : 'w-full'} flex items-center justify-center gap-2 rounded-xl bg-quartier-green px-6 py-3 text-white font-semibold transition-opacity hover:opacity-90 disabled:opacity-50`}
          style={{ minHeight: '48px' }}
        >
          {saving ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Wird gespeichert...
            </>
          ) : (
            <>
              <Save className="h-5 w-5" />
              {isEdit ? 'Aktualisieren' : 'Hinzufuegen'}
            </>
          )}
        </button>
      </div>
    </form>
  );
}
