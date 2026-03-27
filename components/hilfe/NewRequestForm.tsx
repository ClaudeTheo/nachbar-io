'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { HelpCategory, HELP_CATEGORY_LABELS } from '@/lib/hilfe/types';
import { useQuarter } from '@/lib/quarters/quarter-context';

/** Emoji-Icons je Kategorie */
const CATEGORY_ICONS: Record<HelpCategory, string> = {
  einkaufen: '🛒',
  begleitung: '🚶',
  haushalt: '🏠',
  garten: '🌱',
  technik: '💻',
  vorlesen: '📖',
  sonstiges: '❓',
};

const CATEGORIES = Object.keys(HELP_CATEGORY_LABELS) as HelpCategory[];

interface NewRequestFormProps {
  onSuccess?: () => void;
}

/** Formular zum Erstellen eines neuen Hilfe-Gesuchs (Senior-Mode: große Kacheln, max 3 Taps) */
export function NewRequestForm({ onSuccess }: NewRequestFormProps) {
  const { currentQuarter } = useQuarter();
  const [category, setCategory] = useState<HelpCategory | null>(null);
  const [description, setDescription] = useState('');
  const [preferredTime, setPreferredTime] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!category || !currentQuarter) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/hilfe/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quarter_id: currentQuarter.id,
          category,
          description: description || null,
          preferred_time: preferredTime || null,
        }),
      });

      if (!res.ok) {
        throw new Error('Gesuch konnte nicht erstellt werden');
      }

      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Kategorie-Auswahl als große Kacheln */}
      <fieldset>
        <legend className="mb-3 text-base font-semibold text-gray-800">
          Wobei brauchen Sie Hilfe?
        </legend>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              role="radio"
              aria-checked={category === cat}
              aria-label={HELP_CATEGORY_LABELS[cat]}
              onClick={() => setCategory(cat)}
              className={`flex min-h-[80px] flex-col items-center justify-center gap-1 rounded-xl border-2 p-3 text-center transition-colors ${
                category === cat
                  ? 'border-[#4CAF87] bg-[#4CAF87]/10 text-[#2D3142]'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
              }`}
            >
              <span className="text-2xl" aria-hidden="true">
                {CATEGORY_ICONS[cat]}
              </span>
              <span className="text-sm font-medium">
                {HELP_CATEGORY_LABELS[cat]}
              </span>
            </button>
          ))}
        </div>
      </fieldset>

      {/* Beschreibung */}
      <div>
        <label htmlFor="description" className="mb-1 block text-base font-semibold text-gray-800">
          Beschreibung
        </label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Was genau brauchen Sie? (optional)"
          className="min-h-[100px] text-base"
        />
      </div>

      {/* Wunschzeit */}
      <div>
        <label htmlFor="preferred-time" className="mb-1 block text-base font-semibold text-gray-800">
          Wunschzeit
        </label>
        <Input
          id="preferred-time"
          value={preferredTime}
          onChange={(e) => setPreferredTime(e.target.value)}
          placeholder="z.B. Montag Vormittag (optional)"
          className="min-h-[48px] text-base"
        />
      </div>

      {/* Fehlermeldung */}
      {error && (
        <p className="text-sm text-red-600" role="alert">{error}</p>
      )}

      {/* Absende-Button */}
      <Button
        type="submit"
        disabled={!category || submitting}
        className="min-h-[56px] w-full text-lg font-semibold"
      >
        {submitting ? 'Wird gesendet…' : 'Gesuch aufgeben'}
      </Button>
    </form>
  );
}
