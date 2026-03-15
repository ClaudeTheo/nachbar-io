'use client';

// Formular zum Erstellen einer neuen Aufgabe auf der Aufgabentafel

import { useState } from 'react';
import type { TaskCategory, TaskUrgency } from './TaskCard';
import { CATEGORY_CONFIG } from './TaskCard';

interface TaskFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

// Dringlichkeits-Optionen
const URGENCY_OPTIONS: { value: TaskUrgency; label: string }[] = [
  { value: 'low',    label: 'Gering' },
  { value: 'normal', label: 'Normal' },
  { value: 'urgent', label: 'Dringend' },
];

// Dringlichkeits-Farben fuer die Button-Auswahl
const URGENCY_STYLES: Record<TaskUrgency, { active: string; inactive: string }> = {
  low:    { active: 'bg-gray-200 text-anthrazit ring-2 ring-gray-400', inactive: 'bg-gray-50 text-gray-600' },
  normal: { active: 'bg-[#4CAF87]/10 text-[#4CAF87] ring-2 ring-[#4CAF87]', inactive: 'bg-gray-50 text-gray-600' },
  urgent: { active: 'bg-[#F59E0B]/10 text-[#F59E0B] ring-2 ring-[#F59E0B]', inactive: 'bg-gray-50 text-gray-600' },
};

// Alle Kategorien als Array
const CATEGORIES = Object.entries(CATEGORY_CONFIG) as [TaskCategory, { emoji: string; label: string }][];

// Heutiges Datum als YYYY-MM-DD fuer min-Attribut
function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function TaskForm({ onSuccess, onCancel }: TaskFormProps) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<TaskCategory>('other');
  const [urgency, setUrgency] = useState<TaskUrgency>('normal');
  const [description, setDescription] = useState('');
  const [preferredDate, setPreferredDate] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Validierung: Titel 3-200 Zeichen
  const titleTrimmed = title.trim();
  const isValid = titleTrimmed.length >= 3 && titleTrimmed.length <= 200;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid) return;

    setError(null);
    setLoading(true);

    const payload = {
      title: titleTrimmed,
      category,
      urgency,
      description: description.trim() || null,
      preferred_date: preferredDate || null,
    };

    try {
      const res = await fetch('/api/care/tasks', {
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
      {/* Titel */}
      <div className="space-y-1.5">
        <label htmlFor="task-title" className="block text-sm font-medium text-anthrazit">
          Titel <span className="text-red-500">*</span>
        </label>
        <input
          id="task-title"
          type="text"
          required
          minLength={3}
          maxLength={200}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="z.B. Einkauf fuer Frau Mueller"
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-anthrazit placeholder:text-gray-400 focus:border-[#4CAF87] focus:outline-none focus:ring-1 focus:ring-[#4CAF87]"
        />
        <p className="text-xs text-muted-foreground">{titleTrimmed.length}/200 Zeichen (mind. 3)</p>
      </div>

      {/* Kategorie-Raster (4 Spalten) */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-anthrazit">Kategorie</label>
        <div className="grid grid-cols-4 gap-2">
          {CATEGORIES.map(([key, config]) => (
            <button
              key={key}
              type="button"
              onClick={() => setCategory(key)}
              className={`flex flex-col items-center justify-center gap-1 rounded-lg border p-3 text-center transition-colors ${
                category === key
                  ? 'border-[#4CAF87] bg-[#4CAF87]/5 ring-2 ring-[#4CAF87]'
                  : 'border-gray-200 bg-white hover:bg-gray-50'
              }`}
              style={{ minHeight: '48px', touchAction: 'manipulation' }}
            >
              <span className="text-xl">{config.emoji}</span>
              <span className="text-xs font-medium text-anthrazit leading-tight">{config.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Dringlichkeit (3 Buttons nebeneinander) */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-anthrazit">Dringlichkeit</label>
        <div className="flex gap-2">
          {URGENCY_OPTIONS.map((opt) => {
            const isActive = urgency === opt.value;
            const styles = URGENCY_STYLES[opt.value];
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setUrgency(opt.value)}
                className={`flex-1 rounded-lg border border-gray-200 py-2.5 text-sm font-medium transition-colors ${
                  isActive ? styles.active : styles.inactive
                }`}
                style={{ minHeight: '48px', touchAction: 'manipulation' }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Beschreibung (optional) */}
      <div className="space-y-1.5">
        <label htmlFor="task-description" className="block text-sm font-medium text-anthrazit">
          Beschreibung{' '}
          <span className="text-xs font-normal text-muted-foreground">(optional)</span>
        </label>
        <textarea
          id="task-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={1000}
          rows={3}
          placeholder="Weitere Details zur Aufgabe..."
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-anthrazit placeholder:text-gray-400 focus:border-[#4CAF87] focus:outline-none focus:ring-1 focus:ring-[#4CAF87] resize-none"
        />
      </div>

      {/* Wunschdatum (optional) */}
      <div className="space-y-1.5">
        <label htmlFor="task-date" className="block text-sm font-medium text-anthrazit">
          Wunschdatum{' '}
          <span className="text-xs font-normal text-muted-foreground">(optional)</span>
        </label>
        <input
          id="task-date"
          type="date"
          value={preferredDate}
          min={todayISO()}
          onChange={(e) => setPreferredDate(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-anthrazit focus:border-[#4CAF87] focus:outline-none focus:ring-1 focus:ring-[#4CAF87]"
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
          disabled={loading || !isValid}
          className="flex-1 rounded-lg bg-[#4CAF87] py-3 text-sm font-bold text-white hover:bg-green-600 active:bg-green-700 disabled:opacity-50"
          style={{ minHeight: '48px', touchAction: 'manipulation' }}
        >
          {loading ? 'Wird erstellt...' : 'Aufgabe erstellen'}
        </button>
      </div>
    </form>
  );
}
