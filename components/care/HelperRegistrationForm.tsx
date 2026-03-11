'use client';

// Formular zur Registrierung als Helfer mit Rolle, Skills und Verfuegbarkeit

import { useState } from 'react';
import type { CareHelperRole } from '@/lib/care/types';
import { CARE_HELPER_ROLES } from '@/lib/care/constants';

interface HelperRegistrationFormProps {
  /** Senior-ID, fuer die sich der Helfer registriert (optional) */
  seniorId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

// Verfuegbare Faehigkeiten zur Auswahl
const SKILL_OPTIONS: string[] = [
  'Einkaufen',
  'Transport',
  'Besuche',
  'Medikamente',
  'Notfallhilfe',
  'Gartenarbeit',
  'Haushalthilfe',
];

// Verfuegbarkeits-Slots
const AVAILABILITY_SLOTS: { key: keyof AvailabilityState; label: string }[] = [
  { key: 'morgens',  label: 'Morgens' },
  { key: 'mittags',  label: 'Mittags' },
  { key: 'abends',   label: 'Abends' },
];

interface AvailabilityState {
  morgens: boolean;
  mittags: boolean;
  abends: boolean;
}

export function HelperRegistrationForm({ seniorId, onSuccess, onCancel }: HelperRegistrationFormProps) {
  // Formular-Zustand
  const [role, setRole] = useState<CareHelperRole>('neighbor');
  const [skills, setSkills] = useState<string[]>([]);
  const [availability, setAvailability] = useState<AvailabilityState>({
    morgens: false,
    mittags: false,
    abends: false,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Skill an/abwaehlen
  function toggleSkill(skill: string) {
    setSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
  }

  // Verfuegbarkeits-Slot an/abwaehlen
  function toggleAvailability(key: keyof AvailabilityState) {
    setAvailability((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  // Formular absenden: POST /api/care/helpers
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const payload = {
      role,
      skills,
      availability,
      senior_ids: seniorId ? [seniorId] : [],
    };

    try {
      const res = await fetch('/api/care/helpers', {
        method: 'POST',
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
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Rolle */}
      <div className="space-y-1.5">
        <label htmlFor="helper-role" className="block text-sm font-medium text-anthrazit">
          Ihre Rolle <span className="text-red-500">*</span>
        </label>
        <select
          id="helper-role"
          value={role}
          onChange={(e) => setRole(e.target.value as CareHelperRole)}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-anthrazit focus:border-quartier-green focus:outline-none focus:ring-1 focus:ring-quartier-green"
        >
          {CARE_HELPER_ROLES.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.label}
            </option>
          ))}
        </select>
        {/* Beschreibung der gewahlten Rolle */}
        <p className="text-xs text-muted-foreground">
          {CARE_HELPER_ROLES.find((r) => r.id === role)?.description}
        </p>
      </div>

      {/* Faehigkeiten (Multi-Checkbox) */}
      <fieldset>
        <legend className="block text-sm font-medium text-anthrazit mb-2">
          Meine Faehigkeiten <span className="text-xs font-normal text-muted-foreground">(optional)</span>
        </legend>
        <div className="grid grid-cols-2 gap-2">
          {SKILL_OPTIONS.map((skill) => {
            const checked = skills.includes(skill);
            return (
              <label
                key={skill}
                className={`flex items-center gap-2.5 rounded-lg border-2 px-3 py-2.5 cursor-pointer transition-colors ${
                  checked
                    ? 'border-quartier-green bg-green-50 text-anthrazit'
                    : 'border-gray-200 bg-white text-muted-foreground hover:border-gray-300'
                }`}
                style={{ minHeight: '48px', touchAction: 'manipulation' }}
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={checked}
                  onChange={() => toggleSkill(skill)}
                />
                <span
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 transition-colors ${
                    checked ? 'border-quartier-green bg-quartier-green' : 'border-gray-300'
                  }`}
                  aria-hidden="true"
                >
                  {checked && (
                    <svg className="h-2.5 w-2.5 text-white" viewBox="0 0 10 10" fill="none">
                      <path d="M1.5 5L4 7.5L8.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </span>
                <span className="text-sm font-medium">{skill}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      {/* Verfuegbarkeit (Toggle-Buttons) */}
      <fieldset>
        <legend className="block text-sm font-medium text-anthrazit mb-2">
          Verfuegbarkeit <span className="text-xs font-normal text-muted-foreground">(optional)</span>
        </legend>
        <div className="flex gap-3">
          {AVAILABILITY_SLOTS.map(({ key, label }) => {
            const active = availability[key];
            return (
              <button
                key={key}
                type="button"
                onClick={() => toggleAvailability(key)}
                className={`flex-1 rounded-lg border-2 py-3 text-sm font-medium transition-colors ${
                  active
                    ? 'border-quartier-green bg-quartier-green text-white'
                    : 'border-gray-200 bg-white text-muted-foreground hover:border-gray-300'
                }`}
                style={{ minHeight: '48px', touchAction: 'manipulation' }}
                aria-pressed={active}
              >
                {label}
              </button>
            );
          })}
        </div>
      </fieldset>

      {/* Fehlermeldung */}
      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}

      {/* Aktions-Buttons */}
      <div className="flex gap-3 pt-1">
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
          {loading ? 'Wird gespeichert...' : 'Als Helfer registrieren'}
        </button>
      </div>
    </form>
  );
}
